/*
 * jQuery async plugin - TestRun
 *
 */
var TestRun = function() {
  'use strict';

  var slice = Array.prototype.slice,
      concat = Array.prototype.concat,
      bind = Function.prototype.bind,
      toString = Object.prototype.toString;

  var index = 0;
  var results = {
    success: [],
    failure: []
  };

  var log = function() {
    if (typeof console === 'undefined') {
      return function() {};
    }
    if (typeof bind === 'function') {
      return bind.call(console.log, console);
    }
    return function(x) {
      console.log(x);
    };
  }();


  var units = [{
    title: 'Validate the Deferred function',
    code: function() {
      return typeof $.Deferred().addCallback;
    },
    expect: 'function'
  }, {
    title: '$.async.succeed() test',
    code: function() {
      return $.async.succeed(1).addCallback(function(res) {
        return res + 1;
      });
    },
    expect: 2
  }, {
    title: 'Deferred callback response',
    code: function() {
      return $.Deferred().addCallback(function(res) {
        return res + 1;
      }).callback(1);
    },
    expect: 2
  }, {
    title: 'Basic Deferred chain',
    code: function() {
      var r = [];
      var d = $.Deferred();
      return d.addCallback(function(res) {
        r.push(res);
        return res + 1;
      }).addCallback(function(res) {
        r.push(res);
        throw 'error';
      }).addCallback(function(err) {
        r.push('error!');
      }).addErrback(function(err) {
        r.push(err);
        return 'hoge';
      }).addBoth(function(res) {
        r.push(res);
        return res + 1;
      }).addCallback(function(res) {
        r.push(res);
        return r;
      }).callback(1);
    },
    expect: [1, 2, new Error('error'), 'hoge', 'hoge1']
  }, {
    title: '$.async() test',
    code: function() {
      return $.async(function() {
        return 1;
      }).addCallback(function(res) {
        return res + 1;
      });
    },
    expect: 2
  }, {
    title: 'testパターン思いつかない',
    code: function() {
      return $.async(function() {
        return '少しずつ';
      }).addCallback(function(res) {
        return res + 'パターン';
      }).addCallback(function(res) {
        return res + '増やし中';
      }).addBoth(function(res) {
        return res + '・・・';
      });
    },
    expect: 'tesst'
  }];



  function exec() {
    var result = false;
    var fn = units[index].code;
    var actual;

    return $.async(function() {
      return $.async.maybeDeferred(fn).addCallback(function(res) {
        actual = res;
        result = assert(actual, units[index].expect);
      });
    }).addErrback(function(err) {
      result = false;
      log(err);
    }).addBoth(function() {
      append(result, actual);
      return $.async(function() {
        exec();
      });
    });
  }


  function assert(result, expect) {
    var res = equals(result, expect);
    if (!res) {
      throw res;
    }
    return res;
  }


  function append(result, actualResult) {
    var unit = units[index];

    var elem = div('test-unit').append(
                 div('test-unit-title', unit.title)
               ).append(
                 tag('pre', 'test-unit-code', toSourceCode(unit.code))
               ).append(
                 div('test-unit-expect-wrapper clearfix').append(
                   div('test-unit-expect-text', 'expected:')
                 ).append(
                   div('test-unit-expect', dump(unit.expect))
                 )
               );

    var key = result ? 'success' : 'failure';
    var actual = result.toString();

    if (!result) {
      actual += ', actual result: ' + actualResult;
    }

    results[key].push(index);

    elem.append(
      div('test-unit-result-wrapper clearfix').append(
        div('test-unit-actual-text', 'result equals:')
      ).append(
        div('test-unit-actual test-unit-' + key, actual)
      )
    ).appendTo('#result');

    tag('hr').appendTo('#result');

    if (++index >= units.length) {
      $.each([
        tag('h2', 'test-unit-result-end', 'End'),
        tag('h3', 'test-unit-result-length', 'Total: ' + units.length),
        tag('h3', 'test-unit-result-success', 'Success: ' + results.success.length),
        tag('h3', 'test-unit-result-failure', 'Failure: ' + results.failure.length)
      ], function(i, el) {
        el.appendTo('#result');
      });
    }
  }


  function tag(tagName, className, text) {
    return $('<' + tagName + '>').addClass(className || '').text(text || '');
  }


  function div() {
    var args = slice.call(arguments);
    args.unshift('div');
    return tag.apply(null, args);
  }


  function toSourceCode(fn) {
    var code = fn.toString();
    var re = /^([\u0009\u0020]*)/;
    var lines = code.split(/\n/);
    var mf = lines[0].match(re);
    var ml = lines[lines.length - 1].match(re);
    if (mf && ml && mf[0] !== ml[0]) {
      var space = (mf[0].length > ml[0].length) ? mf[0] : ml[0];
      var max = space.length;
      var i = 0;
      var len = lines.length;
      while (i < len) {
        var line = lines[i].replace(new RegExp('^[\\u0009\\u0020]{0,' + max + '}'), '');
        lines[i] = line;
        i++;
      }
      if (/^\s*(["'])use strict\1;?\s*$/.test(lines[1])) {
        lines.splice(1, 1);
        if (/^\s*$/.test(lines[1])) {
          lines.splice(1, 1);
        }
      }
      code = lines.join('\n');
    }
    return code;
  }


  function typeOf(o) {
    if (o === null) {
      return 'null';
    }
    if (Array.isArray(o)) {
      return 'array';
    }
    var m = toString.call(o).match(/\[\w+\s+(\w+)\]/);
    return m ? m[1].toLowerCase() : typeof o;
  }


  function isEmpty(o) {
    for (var p in o) {
      return false;
    }
    return true;
  }


  function dump(o) {
    var r;

    function repr(x) {
      return (x == null) ? ('' + x) :
              x.toString ? x.toString() : ('' + x);
    }

    if (o == null) {
      return ('' + o);
    }

    if (typeof uneval === 'function') {
      return uneval(o);
    } else if (typeof o.toSource === 'function') {
      return o.toSource();
    }

    switch (typeOf(o)) {
      case 'array':
          return '[' + $.map(o, function(v) {
            return dump(v);
          }).join(', ') + ']';
      case 'object':
          r = [];
          $.each(o, function(k, v) {
            r[r.length] = k + ': ' + dump(v);
          });
          return '{' + r.join(', ') + '}';
      case 'string':
          return '"' + repr(o) + '"';
      case 'function':
          return '(' + repr(o) + ')';
      default:
          return repr(o);
    }
  }


  function equals(o, x) {
    var result = false;

    if (o == null) {
      return (o === x);
    }

    switch (typeOf(o)) {
      case 'array':
          if (x && Array.isArray(x)) {
            if (isEmpty(o) && isEmpty(x)) {
              result = true;
            } else if (o.length === 0 && x.length === 0) {
              result = true;
            } else {
              result = false;
              $.each(o, function(i, v) {
                if (!(i in x) || !equals(v, x[i])) {
                  result = false;
                  return false;
                } else {
                  result = true;
                }
              });
            }
          }
          break;
      case 'object':
          if (x && typeOf(x) === 'object') {
            if (isEmpty(o) && isEmpty(x)) {
              result = true;
            } else {
              result = false;
              $.each(o, function(k, v) {
                if (!(k in x) || !equals(v, x[k])) {
                  result = false;
                  return false;
                } else {
                  result = true;
                }
              });
            }
          }
          break;
      case 'string':
          if (typeOf(x) === 'string' && o.toString() === x.toString()) {
            result = true;
          }
          break;
      case 'number':
          if (typeOf(x) === 'number') {
            if (isNaN(x) && isNaN(o)) {
              result = true;
            } else if (!isFinite(x) && !isFinite(o)) {
              result = true;
            } else if (Math.abs(o - x) <= 0.000001) {
              result = true;
            } else {
              result = (o === x);
            }
          }
          break;
      case 'function':
          if (typeOf(x) === 'function' &&
              o.toString() === x.toString() &&
              o.constructor === x.constructor && o.length == x.length) {
            result = true;
          }
          break;
      case 'boolean':
          if (typeOf(x) === 'boolean' && (o != false) == (x != false)) {
            result = true;
          }
          break;
      case 'date':
          if (typeOf(x) === 'date' && o.getTime() === x.getTime()) {
            result = true;
          }
          break;
      case 'error':
          if (typeOf(x) === 'error' &&
              (('message' in o && o.message == x.message) ||
               ('description' in o && o.description == x.description))) {
            result = true;
          }
          break;
      case 'regexp':
          if (typeOf(x) === 'regexp' && o.toString() === x.toString()) {
            result = true;
          }
          break;
      default:
          if (typeOf(o) === typeOf(x) && o === x) {
            result = true;
          }
          break;
    }
    return result;
  }

  return {
    exec: exec,
    results: results
  };
}();

$(function() {
  TestRun.exec();
});

