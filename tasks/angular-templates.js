/*
 * grunt-angular-templates
 * https://github.com/ericclemmons/grunt-angular-templates
 *
 * Copyright (c) 2013 Eric Clemmons
 * Licensed under the MIT license.
 */

'use strict';

var Compiler  = require('./lib/compiler');
var path      = require('path');
var util      = require('util');

module.exports = function(grunt) {

  var bootstrapper = function(module, script, options) {
    return grunt.template.process(
      "<%= angular %>.module('<%= module %>'<%= standalone %>).run(['$templateCache', function($templateCache) {\n<%= script %>\n}]);\n",
      {
        data: {
          'angular':    options.angular,
          'module':     module,
          'standalone': options.standalone ? ', []' : '',
          'script':     script
        }
      }
    );
  };

  grunt.registerMultiTask('ngtemplates', 'Compile AngularJS templates for $templateCache', function() {
    var options = this.options({
      angular:    'angular',
      bootstrap:  bootstrapper,
      concat:     null,
      usemin:     null,
      htmlmin:    {},
      module:     this.target,
      prefix:     '',
      source:     function(source) { return source; },
      standalone: false,
      url:        function(path) { return path; }
    });

    grunt.verbose.writeflags(options, 'Options');

    this.files.forEach(function(file) {
      if (!file.src.length) {
        grunt.log.warn('No templates found');
      }

      var compiler  = new Compiler(grunt, options, file.cwd);
      var modules   = compiler.modules(file.src);
      var compiled  = [];

      for (var module in modules) {
        compiled.push(compiler.compile(module, modules[module]));
      }

      grunt.file.write(file.dest, compiled.join('\n'));
      grunt.log.writeln('File ' + file.dest.cyan + ' created.');

      // Append file.dest to specified concat target
      if (options.concat) {

        if (process.platform === 'win32') {
          options.concat = options.concat.replace(/\//g, '\\');
        }

        var config = grunt.config(['concat', options.concat]);

        if (!config) {
          grunt.log.warn('Concat target not found: ' + options.concat.red);

          return false;
        }

        // Grunt handles files 400 different ways.  Not me.
        var normalized = grunt.task.normalizeMultiTaskFiles(config, options.concat);

        // Only work on the original src/dest, since files.src is a [GETTER]
        var originals = normalized.map(function(files) {
          return files.orig;
        });

        // Append output templates to only .JS targets
        var modified = originals.map(function(files) {
          var jsFiles = files.src.filter(function(file) {
            return '.js' === file.substr(-3);
          });

          if (jsFiles.length) {
            files.src.push(file.dest);
          }

          return files;
        });

        // Re-save processed concat target
        grunt.config(['concat', options.concat], {
          files:    originals,
          options:  config.options || {}
        });

        grunt.log.writeln('Added ' + file.dest.cyan + ' to ' + ('concat:' + options.concat).yellow);
      }

      if (options.usemin) {
        var _ = grunt.util._;
        var target = grunt.config('concat.generated');
        var prefix = '.tmp/concat/';

        if (!target) {
          grunt.fail.fatal('Concat target not found: ' + 'generated'.red);

          return false;
        }

        var files = _.find(target.files, function (item) {
          return item.dest === prefix + options.usemin;
        });

        if (!files) {
          grunt.fail.fatal('Concat destination file not found: ' + options.usemin.red);

          return false;
        }

        files.src.push(file.dest);

        // Re-save processed concat target
        grunt.config('concat', {
          generated: { files: target.files }
        });

        grunt.log.writeln('Added ' + file.dest.cyan + ' to ' + ('concat:generated:files:dest:' + options.usemin).yellow);
      }
    });
  });
};
