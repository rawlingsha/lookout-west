# Run from repository root: Rscript analysis/quarterly/west-energy-bill/R/validate.R
# Independent base-R checks; no package installation or network required.
prices <- read.csv("analysis/quarterly/west-energy-bill/input/state-prices.csv")
stopifnot(nrow(prices) == 13, !anyDuplicated(prices$code),
          identical(sort(prices$code), sort(c("AK","AZ","CA","CO","HI","ID","MT","NV","NM","OR","UT","WA","WY"))))
stopifnot(all(is.finite(as.matrix(prices[,3:5]))), all(prices[,3:5] >= 0))
budget <- function(gallons, cents) {
  stopifnot(is.finite(gallons), gallons %% 1 == 0, gallons >= 0, gallons <= 500,
            is.finite(cents), cents %% 5 == 0, cents >= -200, cents <= 200)
  c(monthly = gallons*cents, two_month = 2*gallons*cents)
}
cases <- data.frame(gallons=c(60,60,80,0,60,500,500), cents=c(100,-50,50,100,0,-200,200), monthly=c(6000,-3000,4000,0,0,-100000,100000))
for (i in seq_len(nrow(cases))) stopifnot(all(budget(cases$gallons[i],cases$cents[i]) == c(cases$monthly[i],2*cases$monthly[i])))
stopifnot(inherits(try(budget(-1,100), silent=TRUE), "try-error"), inherits(try(budget(60,1), silent=TRUE), "try-error"))
nm <- c(-10,0,10)*5645/100
# R's default rounding uses ties to even; publication uses symmetric half-up magnitudes.
rounded <- sign(nm)*floor(abs(nm)+0.5)
stopifnot(identical(nm,c(-564.5,0,564.5)), identical(rounded,c(-565,0,565)))
stopifnot(round(prices$gasoline[match(c("CA","WA","CO"),prices$code)]*60) == c(368,334,261))
stopifnot(abs((1.194-1.151)-0.043)<1e-10, abs((5.467-4.319)-1.148)<1e-10)
write.csv(cases,"analysis/quarterly/west-energy-bill/budget-fixtures.csv",row.names=FALSE)
cat("PASS: 13 states, seven budget cases, invalid inputs, signed fiscal rounding, essay examples and regional comparisons.\n")
