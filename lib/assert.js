module.exports = function(cond, desc) {
  if (!cond) {
    console.log("Assert failed:", desc);
    phantom.exit(1);
  }
};
