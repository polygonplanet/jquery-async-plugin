/*!
 * jQuery async plugin
 *
 * @fileoverview  jQuery async plugin
 * @version       0.1.0
 * @date          2014-09-27
 * @link          https://github.com/polygonplanet/jquery-async-plugin
 * @copyright     Copyright (c) 2013-2014 polygon planet <polygon.planet.aqua@gmail.com>
 * @license       Licensed under the MIT license.
 */
/*
 * Portions of this code are from MochiKit.Async, received by the jQuery.async
 * authors under the MIT license.
 */

(function($) {
'use strict';

var slice = Array.prototype.slice;

// Deferred constructor referenced from Mochikit.Async.Deferred
// http://mochi.github.io/mochikit/
var Deferred = (function() {

  var SUCCESS = 0,
      FAILURE = 1,
      FIRED   = 2,
      UNFIRED = 3;

  function Deferred(canceller) {
    return this.init(canceller);
  };

  Deferred.prototype = {
    Deferred: Deferred,
    state: UNFIRED,
    paused: 0,
    chained: false,
    _unhandledErrorTimerId: null,
    init: function(canceller) {
      var self = this;

      self.chain = [];
      self.results = [null, null];
      self.canceller = canceller;
      return self;
    },
    cancel: function() {
      var self = this;

      self.chain.length = 0;
      if (self.state === UNFIRED) {
        self.canceller && self.canceller(self);
      } else if (self.state === FIRED && isDeferred(self.results[SUCCESS])) {
        self.results[SUCCESS].cancel();
      }
      return self;
    },
    callback: function(res) {
      return prepare.call(this, res);
    },
    errback: function(res) {
      return prepare.call(this, error(res));
    },
    addBoth: function(fn) {
      return this.addCallbacks(fn, fn);
    },
    addCallback: function(fn) {
      return this.addCallbacks(fn, null);
    },
    addErrback: function(fn) {
      return this.addCallbacks(null, fn);
    },
    addCallbacks: function(cb, eb) {
      var self = this;

      if (!self.chained) {
        self.chain.push([cb, eb]);
        if (isFireable(self.state)) {
          fire.call(self);
        }
      }
      return self;
    }
  };

  Deferred.isDeferred = isDeferred;


  function isDeferred(d) {
    return d != null && d.Deferred === Deferred;
  }


  function isFireable(state) {
    return !!(state ^ UNFIRED);
  }


  function error(e) {
    return isError(e) ? e : new Error(e);
  }


  function setState(res) {
    this.state = isError(res) ? FAILURE : SUCCESS;
  }


  function hasErrback() {
    var chain = this.chain, i = 0, len = chain.length;
    for (; i < len; i++) {
      if (chain[i] && $.isFunction(chain[i][1])) {
        return true;
      }
    }
    return false;
  }


  function prepare(res) {
    var self = this;

    setState.call(self, res);
    self.results[self.state] = res;
    return fire.call(self);
  }


  function fire() {
    var self = this;
    var chain = self.chain;
    var res = self.results[self.state];
    var cb, fn, unhandledError;

    if (self._unhandledErrorTimerId && isFireable.call(self) && hasErrback.call(self)) {
      clearTimeout(self._unhandledErrorTimerId);
      delete self._unhandledErrorTimerId;
    }

    while (chain.length && !self.paused) {
      fn = chain.shift()[self.state];

      if (!fn) {
        continue;
      }

      try {
        res = fn.call(self, res);
        setState.call(self, res);

        if (isDeferred(res)) {
          cb = function(r) {
            prepare.call(self, r);
            self.paused--;

            if (!self.paused && isFireable(self.state)) {
              fire.call(self);
            }
          };
          self.paused++;
        }
      } catch (e) {
        self.state = FAILURE;
        res = error(e);

        if (!hasErrback.call(self)) {
          unhandledError = true;
        }
      }
    }
    self.results[self.state] = res;

    if (cb && self.paused) {
      res.addBoth(cb);
      res.chained = true;
    }

    if (unhandledError) {
      // Resolve the error implicit in the asynchronous processing.
      self._unhandledErrorTimerId = setTimeout(function() {
        try {
          throw res;
        } finally {
          delete self._unhandledErrorTimerId;
        }
      }, 0);
    }
    return self;
  }

  return Deferred;
}());

// Deferrize jQuery.Deferred. (jquery-2.0.3)
(function jqDeferrize() {

  var callbacks = 'addCallback addErrback addCallbacks addBoth cancel'.split(' ');

  function attach(target, deferred) {
    target._deferred = deferred;
    deferred._jquery = target;

    target.deferrize = function() {
      return this._deferred;
    };

    var cancel_ = deferred.cancel;
    deferred.cancel = function() {
      var self = this;
      if (self._jquery && self._jquery.canceller) {
        self.canceller = self._jquery.canceller;
      }
      return cancel_.apply(self, arguments);
    };

    $.each(callbacks, function(i, fn) {
      target[fn] = function() {
        return deferred[fn].apply(deferred, arguments);
      };
    });
    return target;
  }

  function deferrize(target, deferred) {
    attach(target, deferred);

    target.callback = function() {
      return deferred.callback.apply(deferred, arguments);
    };
    target.errback = function() {
      return deferred.errback.apply(deferred, arguments);
    };
    deferred.promise = function() {
      return this;
    };

    var promise_ = target.promise;
    target.promise = function() {
      return attach(promise_.apply(this, arguments), this._deferred);
    };

    return target;
  }

  var Deferred_ = $.Deferred;
  $.Deferred = function() {
    var d = new Deferred();
    return deferrize(Deferred_.apply(this, arguments), d);
  };
}());

// Call the function asynchronously.
var nextTick = (function() {
  var byTick = (function() {
    if (typeof process === 'object' && typeof process.nextTick === 'function') {
      return process.nextTick;
    }
  }()),
  byImmediate = (function() {
    if (typeof setImmediate === 'function') {
      return function(callback) {
        try {
          return setImmediate(callback);
        } catch (e) {
          return (byImmediate = byTimer)(callback);
        }
      };
    }
  }()),
  byMessage = (function() {
    var channel, queue;

    if (typeof MessageChannel !== 'function') {
      return false;
    }

    try {
      channel = new MessageChannel();
      if (!channel.port1 || !channel.port2) {
        return false;
      }

      queue = [];
      channel.port1.onmessage = function() {
        queue.shift()();
      };
    } catch (e) {
      return false;
    }

    return function(callback) {
      queue.push(callback);
      channel.port2.postMessage('');
    };
  }()),
  byEvent = (function() {
    if (typeof window !== 'object' || typeof document !== 'object' ||
        typeof Image !== 'function' ||
        typeof document.addEventListener !== 'function'
    ) {
      return false;
    }

    try {
      if (typeof new Image().addEventListener !== 'function') {
        return false;
      }
    } catch (e) {
      return false;
    }

    // Dummy 1x1 gif image.
    var data = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

    return function(callback) {
      var img = new Image();
      var done = false;
      var handler = function() {
        img.removeEventListener('load', handler, false);
        img.removeEventListener('error', handler, false);

        if (!done) {
          done = true;
          callback();
        }
      };

      img.addEventListener('load', handler, false);
      img.addEventListener('error', handler, false);

      try {
        img.src = data;
      } catch (e) {
        (byEvent = byTimer)(callback);
      }
    };
  }()),
  byTimer = function(callback, msec) {
    return setTimeout(callback, msec || 0);
  };

  return function(callback) {
    return (byTick || byImmediate || byMessage || byEvent || byTimer)(callback);
  };
}());

/**
 * A shortcut faster way of creating new Deferred sequence.
 *
 * @example
 *   $.async(function() {
 *     console.log('Start Deferred chain');
 *   }).addCallback(function() {
 *     console.log('End Deferred chain');
 *   });
 *
 * @param {function|*} fn  A callback function or any value.
 * @return {Deferred} Return a Deferred object.
 */
$.async = function(fn) {
  var d = new Deferred();
  var value;

  if ($.isFunction(fn)) {
    var args = slice.call(arguments, 1);
    d.addCallback(function() {
      return fn.apply(this, args);
    });
  } else {
    value = fn;
  }

  nextTick(function() {
    d.callback(value);
  });

  return d;
};

$.extend($.async, {
  /**
   * Deferred constructor (not jQuery.Deferred).
   *
   * @example
   *   var d = new $.async.Deferred(); // You can use $.Deferred()
   *   d.addCallback(function() {
   *     return 1;
   *   }).addCallback(function(res) {
   *     console.log(res); // 1
   *     throw new Error('error');
   *   }).addCallback(function(res) {
   *     console.log('This message does not show');
   *     return 'noop';
   *   }).addErrback(function(err) {
   *     console.log(err); // error
   *     return 'hoge';
   *   }).addBoth(function(res) {
   *     console.log(res); // hoge
   *   }).callback();
   *
   * @param {(function)} [canceller] A cancel() callback function.
   * @return {Deferred} Return a new instance of Deferred (not jQuery.Deferred).
   */
  Deferred: Deferred,
  /**
   * Checks whether an argument is Error object.
   *
   * @example
   *   console.log( $.async.isError(new Error()) ); // true
   *   console.log( $.async.isError(new SyntaxError()) ); // true
   *   console.log( $.async.isError({}) ); // false
   *
   * @param {*} x Target object.
   * @return {boolean} Return true if argument is Error object.
   */
  isError: isError,
  /**
   * Checks whether an argument is Defererd (not jQuery.Deferred).
   *
   * @example
   *   console.log( $.async.isDeferred(new $.async.Deferred()) ); // true
   *   console.log( $.async.isDeferred($.Deferred()) ); // false
   *   console.log( $.async.isDeferred({}) ); // false
   *
   * @param {*} x Target object.
   * @return {boolean} Return true if argument is an instance of Deferred.
   */
  isDeferred: Deferred.isDeferred,
  /**
   * Checks whether an argument is jQuery.Defererd.
   *
   * @example
   *   console.log( $.async.isjQueryDeferred($.Deferred()) ); // true
   *   console.log( $.async.isjQueryDeferred(new $.async.Deferred()) ); // false
   *   console.log( $.async.isjQueryDeferred({}) ); // false
   *
   * @param {*} x Target object.
   * @return {boolean} Return true if argument is jQuery.Deferred/Promise.
   */
  isjQueryDeferred: isjQueryDeferred,
  /**
   * Return a new instance of Deferred that has already had .callback(result) called.
   *
   * @example
   *   function testFunc(value) {
   *     var result;
   *     if (value) {
   *       result = $.async.succeed('succeed');
   *     } else {
   *       var d = new $.Deferred();
   *       result = d.addCallback(function() {
   *         return 'callbacked';
   *       }).callback();
   *     }
   *     return result;
   *   }
   *   testFunc(Math.random() * 10 >= 5).addCallback(function(res) {
   *     console.log(res); // res = 'succeed' or 'callbacked'
   *   });
   *
   * @param {*} [...] The result to give to .callback(result).
   * @return {Deferred} Return an instance of Deferred object.
   */
  succeed: function() {
    var d = new Deferred();
    return d.callback.apply(d, arguments);
  },
  /**
   * Return a new instance of Deferred that has already had .errback(result) called.
   *
   * @example
   *    $.async.fail(1).addCallback(function(res) {
   *      console.log(neverHappen());
   *    }).addErrback(function(err) {
   *      console.log('err', err); // err: 1
   *    });
   *
   * @example
   *    function testFunc(value) {
   *      var result;
   *      if (value) {
   *        result = $.async.fail('fail');
   *      } else {
   *        var d = new $.async.Deferred();
   *        result = d.addCallbacks(function() {
   *          return 'noop';
   *        }, function() {
   *          return 'errbacked';
   *        });
   *        d.errback();
   *      }
   *      return result;
   *    }
   *    testFunc(Math.random() * 10 >= 5).addCallback(function(res) {
   *      console.log(res); // 'errbacked'
   *    }).addErrback(function(err) {
   *      console.log(err); // Error: fail
   *    });
   *
   * @param {*} [...] The result to give to .errback(result).
   * @return {Deferred} Return an instance of Deferred object.
   */
  fail: function() {
    var d = new Deferred();
    return d.errback.apply(d, arguments);
  },
  /**
   * Return a new instance of Deferred surely that maybe as a Deferred.
   *
   * @example
   *   var maybeTest = function(obj) {
   *     var deferred = $.async.maybeDeferred(obj);
   *     console.log(deferred); // (object Deferred {...})
   *     return deferred;
   *   };
   *   var obj;
   *   if (Math.random() * 10 < 5) {
   *     var d = new $.async.Deferred();
   *     obj = d.addCallback(function() {
   *       return 'foo';
   *     }).callback();
   *   } else {
   *     obj = 'bar';
   *   }
   *   maybeTest(obj).addCallback(function(res) {
   *     console.log('res = ' + res); // 'foo' or 'bar'
   *   });
   *
   * @param {*} x Value like a Deferred.
   * @retrun {Deferred} Return a Deferred instance.
   */
  maybeDeferred: function(x) {
    var result, v;

    try {
      if (isError(x)) {
        throw x;
      }

      if ($.isFunction(x)) {
        v = x.apply(x, slice.call(arguments, 1));
      } else {
        v = x;
      }

      if ($.async.isDeferred(v)) {
        result = v;
      } else {
        result = $.async.succeed(v);
      }
    } catch (e) {
      result = $.async.fail(e);
    }
    return result;
  },
  /**
   * Return an array of Deferred instances maybe.
   *
   * @example
   *    var list = $.async.maybeDeferreds(1, 2, 'foo', 'bar',
   *                                      function() { return 5 },
   *                                      $.async.succeed(100))
   *
   *    console.log(list); // [ 1, 2, ... (deferred instances) ]
   *    list[0].addCallback(function(res) {
   *      console.log(res); // 1
   *    });
   *
   * @param {...*} [...] Variable arguments that convert to the Deferred object.
   * @retrun {array.<Deferred>} Return an array of Deferred.
   */
  maybeDeferreds: function() {
    return $.map(slice.call(arguments), $.async.maybeDeferred);
  },
  /**
   * Return a new cancellable Deferred that will .callback() after
   *  at least seconds have elapsed.
   *
   * @example
   *   // Called after 5 seconds.
   *   $.async.wait(5).addCallback(function() {
   *     console.log('Begin wait() test');
   *   }).addCallback(function() {
   *     return $.async.wait(2); // Wait 2 seconds.
   *   }).addCallback(function() {
   *     console.log('End wait() test');
   *   });
   *
   * @param {number} seconds Number of seconds.
   * @param {*} [value] (optional) The value passed to the next chain.
   * @return {Deferred} Return an instance of Deferred.
   */
  wait: function(seconds, value) {
    var timerId;
    var args = slice.call(arguments, 1);
    var d = new Deferred(function() {
      clearTimeout(timerId);
    });

    timerId = setTimeout(function() {
      d.callback();
    }, Math.floor(((seconds - 0) || 0) * 1000));

    if (args.length) {
      d.addCallback(function() {
        return value;
      });
    }
    return d;
  },
  /**
   * Call the specified function after a few(seconds) seconds.
   *
   * @example
   *   var value = null;
   *   // Called after 1 second.
   *   $.async.callLater(1, function() {
   *     value = 'hoge';
   *   });
   *   console.log(value); // null
   *   $.async.callLater(1, function() {
   *     console.log(value); // 'hoge'
   *   });
   *
   * @param {number} seconds Number of seconds to delay.
   * @param {function} callback A callback function.
   * @return {Deferred} Return an instance of Deferred.
   */
  callLater: function(seconds, func) {
    var args = slice.call(arguments, 2);

    return $.async.wait(seconds).addCallback(function() {
      if ($.async.isDeferred(func)) {
        return func.callback.apply(func, args);
      }
      if ($.isFunction(func)) {
        return func.apply(func, args);
      }
      return func;
    });
  },
  /**
   * Wait until the condition completed.
   * If true returned, waiting state will end.
   *
   * @example
   *   console.log('Begin till');
   *   $.async.till(function() {
   *     // wait until the DOM body element is loaded
   *     if (!document.body) {
   *       return false;
   *     } else {
   *       return true;
   *     }
   *   }).addCallback(function() {
   *     console.log('End till');
   *     document.body.innerHTML += 'hoge';
   *   });
   *
   * @param {function} cond A function as condition.
   * @return {Deferred} Return an instance of Deferred.
   */
  till: function(cond) {
    var d = new Deferred();
    var args = slice.call(arguments, 1);
    var interval = 13;
    var locked, done;

    var next = function() {
      if (done) {
        return;
      }

      if (locked) {
        return setTimeout(next, interval);
      }
      locked = true;
      var time = $.now();

      $.async(function() {
        return cond.apply(this, args);
      }).addCallback(function(res) {
        if (res) {
          done = true;
          d.callback();
        } else {
          var ms = Math.max(1, Math.min(1000, interval + ($.now() - time)));

          setTimeout(function() {
            locked = false;
            next();
          }, ms);
        }
      });
    }

    $.async(next);
    return d;
  }
});


function isError(x) {
  return x != null && (x instanceof Error || $.type(x) === 'error');
}

function isjQueryDeferred(x) {
  return x != null && $.isFunction(x.always);
}

}(jQuery));
