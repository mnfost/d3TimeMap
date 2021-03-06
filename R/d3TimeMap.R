#' @importFrom chron chron
#' @importFrom date as.date
#' @importFrom lubridate period_to_seconds hms
#' @importFrom reshape2 melt dcast
#' @importFrom MASS kde2d
#' @importFrom stats loess predict
#' @importFrom RColorBrewer brewer.pal
NULL

#' D3 Time Map widget
#'
#' Interactive time maps based on htmlwidgets and d3.js
#'
#' @param x -- A matrix of timestamp or time, date data
#' @param n -- Number of Colors default is 5. Must be between 1 and 11
#' @param dateOrder -- order of date values options:
#'		1 = month, day, year (default)
#'		2 = day, month, year
#'		3 = year, month, day
#'		4 = year, day, month
#' @param longYear -- year format
#'		1 = abbreviated year (11) (default)
#'		2 = full year (2011)
#' @param day -- separate data by date? default: FALSE
#' @param period -- time period options:
#'		1 = milliseconds
#'		2 = seconds (default)
#'		3 = minutes
#'		4 = hours
#' @param point_size points size.
#' @param point_opacity points opacity
#' @param col_var optional vector for points color mapping
#' @param tooltips logical value to display tooltips when hovering points
#' @param tooltip_text optional character vector of tooltips text
#' @param xlab x axis label
#' @param ylab y axis label
#' @param xlim numeric vector of length 2, manual x axis limits
#' @param ylim numeric vector of length 2, manual y axis limits
#' @param width figure width, computed when displayed
#' @param height figure height, computed when displayed
#'
#' @description Generates an interactive time map based on d3.js.
#' Interactive features include brushing and tooltips.
#'
#' @author Mindy Foster <mnfost3r@@gmail.com>
#'
#' @source D3.js was created by Michael Bostock. See \url{http://d3js.org/}
#'
#'
#' @export
#'

d3TimeMap <- function(x, n=5, dateOrder = 1, longYear = 1, day = FALSE, period = 2,
                      lab = NULL, point_size = 64, labels_size = 10,
                      point_opacity = 1, fixed = FALSE, col_var = NULL,
                      colors = rev(brewer.pal(n,"RdYlBu")),
                      col_lab = NULL,
                      key_var = NULL,
                      type_var = NULL,
                      tooltips = TRUE,
                      tooltip_text = NULL,
                      xlab = NULL, ylab = NULL,
                      html_id = NULL,
                      width = NULL, height = NULL,
                      legend_width = 150,
                      xlim = NULL, ylim = NULL,
                      dom_id_reset_brush = "scatterD3-reset-brush",
                      dom_id_svg_export = "scatterD3-svg-export",
                      transitions = TRUE) {

  ## List of hashes for each data variable, to track which data elements changed
  ## to apply updates and transitions in shiny app.
  hashes <- list()
  if (transitions) {
    for (var in c("x", "dateOrder", "longYear", "day", "period", "col_var")) {
      hashes[[var]] <- digest::digest(get(var), algo = "sha256")
    }
  }

  ## Variable names as default labels
  if (is.null(xlab)) xlab <- paste0("Time Before (",ty[period],")")
  if (is.null(ylab)) ylab <- paste0("Time After (",ty[period],")")
  if (is.null(col_lab)) col_lab <- deparse(substitute(col_var))
  if (is.null(html_id)) html_id <- paste0("d3TimeMap-", paste0(sample(LETTERS,8,replace = TRUE),collapse = ""))


  # create a list that contains the settings
  settings <- list(
    labels_size = labels_size,
    point_size = point_size,
    point_opacity = point_opacity,
    xlab = xlab,
    ylab = ylab,
    has_labels = !is.null(lab),
    col_var = col_var,
    col_lab = col_lab,
    colors = colors,
    key_var = key_var,
    type_var = type_var,
    has_color_var = !is.null(col_var),
    has_legend = !is.null(col_var),
    has_tooltips = tooltips,
    tooltip_text = tooltip_text,
    has_custom_tooltips = !is.null(tooltip_text),
    fixed = fixed,
    legend_width = legend_width,
    html_id = html_id,
    xlim = xlim,
    ylim = ylim,
    dom_id_reset_brush = dom_id_reset_brush,
    dom_id_svg_export = dom_id_svg_export,
    transitions = transitions,
    hashes = hashes
  )

  #separate date and time
  out <- date_time(x, col_var)

  #normalize time and date
  out$time = chron(times=out$time)
  out$date = as.Date(as.character(as.date(out$date, dt[dateOrder])),dl[longYear])
  out = out[order(out$date,out$time),]
  out$time = period_to_seconds(hms(out$time))*ds[period]
  out$id = as.numeric(1:nrow(out))
  if(!is.null(col_var)){col_var = out[,col_var]
  out = out[,names(out) != col_var]}

  # calculate time differences:
  if(day == FALSE){diffs = abs(diff(out$time))}
  else{md = melt(out, id=c("id","date"))
  test = dcast(md, id+variable~date)
  diffs = sapply(test[,3:length(test)], function(f){abs(diff(f))})
  diffs = rowSums(diffs, na.rm=TRUE)}

  #create x and y
  xcoords = diffs[1:(length(diffs)-1)] # all differences except the last
  ycoords = diffs[-1] # all differences except the first

  data <- data.frame(x = xcoords, y = ycoords)
  if (!is.null(col_var)) data <- cbind(data, col_var = col_var)
  if (!is.null(type_var)) data <- cbind(data, type_var = type_var)
  if (!is.null(key_var)) data <- cbind(data, key_var = key_var)
  else data <- cbind(data, key_var = seq_along(xcoords))
  if (!is.null(tooltip_text)) data <- cbind(data, tooltip_text = tooltip_text)

  if(is.null(col_var)){
    # Calculate 2d density over a grid
    dens <- kde2d(data$x,data$y)
    # create a new data frame of that 2d density grid
    # (needs checking that I haven't stuffed up the order here of z?)
    gr <- data.frame(with(dens, expand.grid(x,y)), as.vector(dens$z))
    names(gr) <- c("xgr", "ygr", "zgr")
    # Fit a model
    mod <- loess(zgr~xgr*ygr, data=gr)
    # Apply the model to the original data to estimate density at that point
    data$col_var <- predict(mod, newdata=data.frame(xgr=data$x, ygr=data$y))
  }
  # pass the data and settings using 'x'
  x <- list(data = data,settings = settings)

  # create widget
  htmlwidgets::createWidget(
    name = 'd3TimeMap',
    x,
    width = width,
    height = height,
    package = 'd3TimeMap',
    sizingPolicy = htmlwidgets::sizingPolicy(browser.fill = TRUE,viewer.fill = TRUE)
  )
}
###
date_time <- function(x, col_var=NULL){
  #input must be a matrix
  if(!is.null(col_var)){colvar=x[,col_var]
  x= x[,names(x) != col_var]}
  if(!is.matrix(x)) {x <- as.matrix(x)}
  if(!is.matrix(x)) {stop("x must be a matrix")}
  if(length(x[1,])>2) {stop("x must have 2 or fewer date/time columns")}

  #separate date and time
  x = as.matrix(sapply(x,function(f){gsub("\\[?|\\]?", "", f)}, USE.NAMES=FALSE))
  if(length(x[1,])==1){x = as.matrix(t(sapply(x,function(f){unlist(strsplit(f," "))}, USE.NAMES=FALSE)))}
  if(length(x[1,])>2){x = x[,grepl("(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may?|jun(e)?|jul(y)?|aug(ust)?|sep(tember)?|oct(ober)?|nov(ember)?|dec(ember)?|[[:digit:]])", x[1,], ignore.case=TRUE)]}
  if(length(x[1,])>2){x = x[,!grepl("\\+\\d\\d", x[1,])]}
  if(length(x[1,])==1){x = as.matrix(t(sapply(x,function(f){unlist(strsplit(f,":"))}, USE.NAMES=FALSE)))}

  #define date and time
  time = x[,grepl("\\d\\d[:punct:]\\d\\d[:punct:]", x[1,])]
  if(is.null(time)){date = x[,grepl("[:punct:]", x[1,])]
  x = x[,!grepl("[:punct:]", x[1,])]
  time= x = sapply(x, function(f){paste0(f, collapse=":")})}
  else{x = as.matrix(x[,!grepl("\\d\\d[:punct:]\\d\\d[:punct:]", x[1,])])
  if(length(x[1,])>1){x = sapply(x, function(f){paste0(f, collapse="")})}}
  if(is.null(col_var)){
    out <- as.data.frame(cbind(x, time), stringsAsFactors = FALSE)
    colnames(out) <- c("date", "time")
  }
  else{
    out <- as.data.frame(cbind(x, time, colvar), stringsAsFactors = FALSE)
    colnames(out) <- c("date", "time", "col_var")}
  return(out)
}
###
dt = c("mdy","dmy","ymd","ydm")
dl = c("%d%b%y","%d%b%Y")
ds = c(1000, 1, 1/60, 1/3600)
ty = c('milliseconds','seconds','minutes','hours')
###
#' Wrapper functions for using d3TimeMap in shiny
#'
#' Use \code{d3TimeMapOutput} to create a UI element, and \code{renderD3TimeMap}
#' to render the timemap.
#'
#' @param outputId Output variable to read from
#' @param width,height The width and height of the map (see
#'   \link[htmlwidgets]{shinyWidgetOutput})
#' @param expr An expression that generates a \code{\link{d3TimeMap}} object
#' @param env The environment in which to evaluate \code{expr}
#' @param quoted Is \code{expr} a quoted expression (with \code{quote()})? This
#'   is useful if you want to save an expression in a variable.
#'
#' @rdname d3TimeMap-shiny
#' @export
d3TimeMapOutput <- function(outputId, width = '100%', height = '600px'){
  htmlwidgets::shinyWidgetOutput(outputId, 'd3TimeMap', width, height, package = 'd3TimeMap')
}

#' @rdname d3TimeMap-shiny
#' @export
renderD3TimeMap <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  htmlwidgets::shinyRenderWidget(expr, d3TimeMapOutput, env, quoted = TRUE)
}
