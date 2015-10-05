# Configuration

Overwrite/append the [default webgme configuration](https://github.com/webgme/webgme/blob/master/config/config.default.js) in `config.default.js`.

When adding your own paths, make sure to either use `__dirname` or a relative path which will be resolved from your repository's root.

To load another configuration set the environment variable `NODE_ENV` to the wanted configuration, e.g. on windows `set NODE_ENV = app` will load `config.app.js`.
