// slimerJs can't accept multiple arguments in console.log
module.exports = function() {
  var arr = [].slice.call(arguments).map(function(arg) {
    if ({}.toString.call(arg) == '[object Object]') {
      return JSON.stringify(arg, null, 2);
    }
    return arg;
  });
  console.log(arr.join(' '));
};