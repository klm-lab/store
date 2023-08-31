if (process.env.NODE_ENV === "production") {
  module.exports = require("./store.min.js");
} else {
  module.exports = require("./store.js");
}
