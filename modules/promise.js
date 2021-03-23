/*
Copyright 2018 Intel Corporation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

var refTable = {};

function promiseInitializer(r,j)
{
    this._res = r;
    this._rej = j;
}

function getRootPromise(obj)
{
    while(obj.parentPromise)
    {
        obj = obj.parentPromise;
    }
    return (obj);
}

function event_switcher(desired_callee, target)
{
    return ({ _ObjectID: 'event_switcher', func: target.bind(desired_callee) });
}

function event_forwarder(sourceObj, sourceName, targetObj, targetName)
{
    sourceObj.on(sourceName, targetObj.emit.bind(targetObj));
}


function return_resolved()
{
    var parms = ['resolved'];
    for (var ai in arguments)
    {
        parms.push(arguments[ai]);
    }
    this._XSLF.emit.apply(this._XSLF, parms);
}
function return_rejected()
{
    this._XSLF.promise.__childPromise._rej(e);
}
function Promise(promiseFunc)
{
    this._ObjectID = 'promise';
    this.promise = this;
    this._internal = { _ObjectID: 'promise.internal', promise: this, completed: false, errors: false, completedArgs: [], internalCount: 0, _up: null };
    require('events').EventEmitter.call(this._internal);
    Object.defineProperty(this, "parentPromise",
        {
            get: function () { return (this._up); },
            set: function (value)
            {
                if (value != null && this._up == null)
                {
                    // We are no longer an orphan
                    if (this._internal.uncaught != null)
                    {
                        clearImmediate(this._internal.uncaught);
                        this._internal.uncaught = null;
                    }
                }
                this._up = value;
            }
        });
    Object.defineProperty(this, "descriptorMetadata",
        {
            get: function ()
            {
                return (require('events').getProperty.call(this._internal, '?_FinalizerDebugMessage'));
            },
            set: function (value)
            {
                require('events').setProperty.call(this._internal, '?_FinalizerDebugMessage', value);
            }
        });
    this._internal.on('~', function ()
    {
        this.completedArgs = [];
    });
    this._internal.on('newListener2', (function (eventName, eventCallback)
    {
        //console.log('newListener', eventName, 'errors/' + this.errors + ' completed/' + this.completed);
        var r = null;

        if (eventName == 'resolved' && !this.errors && this.completed)
        {
            r = eventCallback.apply(this, this.completedArgs);
            if(r!=null)
            {
                this.emit_returnValue('resolved', r);
            }
            this.removeAllListeners('resolved');
            this.removeAllListeners('rejected');
        }

        if (eventName == 'rejected' && (eventCallback.internal == null || eventCallback.internal == false))
        {
            var rp = getRootPromise(this.promise);
            rp._internal.external = true;
            if (this.uncaught != null)
            {
                clearImmediate(this.uncaught);
                this.uncaught = null;
            }
            if (rp._internal.uncaught != null)
            {
                clearImmediate(rp._internal.uncaught);
                rp._internal.uncaught = null;
            }
        }

        if (eventName == 'rejected' && this.errors && this.completed)
        {
            eventCallback.apply(this, this.completedArgs);
            this.removeAllListeners('resolved');
            this.removeAllListeners('rejected');
        }
        if (eventName == 'settled' && this.completed)
        {
            eventCallback.apply(this, []);
        }
    }).internal);
    this._internal.resolver = function _resolver()
    {
        if (this.completed) { return; }
        this.errors = false;
        this.completed = true;
        this.completedArgs = [];
        var args = ['resolved'];
        if (this.emit_returnValue && this.emit_returnValue('resolved') != null)
        {
            this.completedArgs.push(this.emit_returnValue('resolved'));
            args.push(this.emit_returnValue('resolved'));
        }
        else
        {
            for (var a in arguments)
            {
                this.completedArgs.push(arguments[a]);
                args.push(arguments[a]);
            }
        }
        if (args.length == 2 && args[1]!=null && typeof(args[1]) == 'object' && args[1]._ObjectID == 'promise')
        {
            var pr = getRootPromise(this.promise);
            args[1]._XSLF = this;
            args[1].then(return_resolved, return_rejected);
        }
        else
        {
            this.emit.apply(this, args);
            this.emit('settled');
        }
    };

    this._internal.rejector = function _rejector()
    {
        if (this.completed) { return; }
        this.errors = true;
        this.completed = true;
        this.completedArgs = [];
        var args = ['rejected'];
        for (var a in arguments)
        {
            this.completedArgs.push(arguments[a]);
            args.push(arguments[a]);
        }

        var r = getRootPromise(this.promise);
        if ((r._internal.external == null || r._internal.external == false) && r._internal.uncaught == null)
        {
            r._internal.uncaught = setImmediate(function (a) 
            {
                process.emit('uncaughtException', 'promise.uncaughtRejection: ' + JSON.stringify(a));
            }, arguments[0]);
        }

        this.emit.apply(this, args);
        this.emit('settled');
    };

    this.catch = function(func)
    {
        var rt = getRootPromise(this);
        this._internal.once('rejected', event_switcher(this, func).func.internal);
    }
    this.finally = function (func)
    {
        this._internal.once('settled', event_switcher(this, func).func.internal);
    };
    this.then = function (resolved, rejected)
    {
        if (resolved)
        {
            this._internal.once('resolved', event_switcher(this, resolved).func.internal);
        }
        if (rejected)
        {
            this._internal.once('rejected', event_switcher(this, rejected).func.internal);
        }
          
        var retVal = new Promise(promiseInitializer);
        retVal.parentPromise = this;

        if (this._internal.completed)
        {
            // This promise was already resolved, so lets check if the handler returned a promise
            var rv = this._internal.emit_returnValue('resolved');
            if(rv!=null)
            {
                if(rv._ObjectID == 'promise')
                {
                    rv.parentPromise = this;
                    rv._internal.once('resolved', retVal._internal.resolver.bind(retVal._internal).internal);
                    rv._internal.once('rejected', retVal._internal.rejector.bind(retVal._internal).internal);
                }
                else
                {
                    retVal._internal.resolver.call(retVal._internal, rv);
                }
            }
            else
            {
                this._internal.once('resolved', retVal._internal.resolver.bind(retVal._internal).internal);
                this._internal.once('rejected', retVal._internal.rejector.bind(retVal._internal).internal);
            }
        }
        else
        {
            this._internal.once('resolved', retVal._internal.resolver.bind(retVal._internal).internal);
            this._internal.once('rejected', retVal._internal.rejector.bind(retVal._internal).internal);
        }

        this.__childPromise = retVal;
        return(retVal);
    };

    try
    {
        promiseFunc.call(this, this._internal.resolver.bind(this._internal), this._internal.rejector.bind(this._internal));
    }
    catch (e)
    {
        this._internal.errors = true;
        this._internal.completed = true;
        this._internal.completedArgs = [e];
        this._internal.emit('rejected', e);
        this._internal.emit('settled');
    }

    if(!this._internal.completed)
    {
        // Save reference of this object
        refTable[this._internal._hashCode()] = this._internal;
        this._internal.once('settled', function ()
        {
            delete refTable[this._hashCode()];
        });
    }
    Object.defineProperty(this, "completed", {
        get: function ()
        {
            return (this._internal.completed);
        }
    });

    this._internal.once('settled', (function ()
    {
        delete this.promise._up;
        delete this.promise.__childPromise;
        delete this.promise.promise;

        delete this._up;
        delete this.__childPromise;
        delete this.promise;
        this.removeAllListeners('resolved');
        this.removeAllListeners('rejected');
    }).internal);
}

Promise.resolve = function resolve()
{
    var retVal = new Promise(function (r, j) { });
    var args = [];
    for (var i in arguments)
    {
        args.push(arguments[i]);
    }
    retVal._internal.resolver.apply(retVal._internal, args);
    return (retVal);
};
Promise.reject = function reject() {
    var retVal = new Promise(function (r, j) { });
    var args = [];
    for (var i in arguments) {
        args.push(arguments[i]);
    }
    retVal._internal.rejector.apply(retVal._internal, args);
    return (retVal);
};
Promise.all = function all(promiseList)
{
    var ret = new Promise(function (res, rej)
    {
        this.__rejector = rej;
        this.__resolver = res;
        this.__promiseList = promiseList;
        this.__done = false;
        this.__count = 0;
    });

    for (var i in promiseList)
    {
        promiseList[i].then(function ()
        {
            // Success
            if(++ret.__count == ret.__promiseList.length)
            {
                ret.__done = true;
                ret.__resolver(ret.__promiseList);
            }
        }, function (arg)
        {
            // Failure
            if(!ret.__done)
            {
                ret.__done = true;
                ret.__rejector(arg);
            }
        });
    }
    if (promiseList.length == 0)
    {
        ret.__resolver(promiseList);
    }
    return (ret);
};

module.exports = Promise;
module.exports.event_switcher = event_switcher;
module.exports.event_forwarder = event_forwarder;
module.exports.defaultInit = function defaultInit(res, rej) { this.resolve = res; this.reject = rej; }