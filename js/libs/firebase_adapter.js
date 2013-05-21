(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        //Allow using this built library as an AMD module
        //in another project. That other project will only
        //see this AMD call, not the internal modules in
        //the closure below.
        define(factory);
    } else {
        //Browser globals case. Just assign the
        //result to a property on the global.
        root.DS.Firebase = factory();
    }
}(this, function () {
    //almond, and your modules will be inlined here

/**
 * almond 0.2.5 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("vendor/almond", function(){});

define("firebase_adapter",
  ["firebase/adapter","firebase/model","firebase/serializer"],
  function(__dependency1__, __dependency2__, __dependency3__) {
    
    var Adapter = __dependency1__.Adapter;
    var Model = __dependency2__.Model;
    var LiveModel = __dependency2__.LiveModel;
    var Serializer = __dependency3__.Serializer;

    var expts = {
      Adapter: Adapter,
      Model: Model,
      LiveModel: LiveModel,
      Serializer: Serializer
    }


    return expts;
  });

define("firebase/adapter",
  ["firebase/serializer","exports"],
  function(__dependency1__, __exports__) {
    
    var Serializer = __dependency1__.Serializer;

    var Adapter = DS.Adapter.extend({
      serializer: Serializer.create(),

      localLock: false,
      _listenRefs: [],

      fb: undefined,

      init: function() {
        if (!this.dbName && !this.url) {
          throw new Error("You must specify a dbName representing the subdomain of your Firebase.");
        }

        if (!this.url) this.url = "https://" + this.dbName + ".firebaseio.com";
        this.fb = new Firebase(this.url);

        this._super();
      },

      createRecords: function(store, type, records) {
        records.forEach(function(record) {
          var ref = record.getRef();
          var data = record.serialize();

          // goofy. causes child_added callback on findAll to ignore local additions, 
          // preventing duplicate items
          this.localLock = true;
          ref.update(data);
          this.localLock = false;
        }.bind(this));
        store.didSaveRecords(records);
      },

      updateRecords: function(store, type, records) {
        records.forEach(function(record) {
          var ref = record.getRef();
          var data = record.serialize();
      
          ref.update(data);
        }.bind(this));
        store.didSaveRecords(records);
      },

      deleteRecords: function(store, type, records) {
        records.forEach(function(record) {
          var ref = record.getRef();
          this.localLock = true;
          ref.remove();
          this.localLock = false;
        }.bind(this));
        store.didSaveRecords(records);
      },

      find: function(store, type, id) {
        var ref = this._getRefForType(type).child(id);
        ref.once("value", function(snapshot) {
          // TODO: ew, silent failure.
          var data = Ember.copy(snapshot.val()) || {};
          data.id = id;
      
          this.didFindRecord(store, type, data, id);
        }.bind(this));
      },

      findAll: function(store, type) {
        var ref = this._getRefForType(type);
    
        ref.once("value", function(snapshot) {
          var results = [];
          snapshot.forEach(function(child) {
            var data = child.val();
            data.id = child.name();
            results.push(Ember.copy(data));
          }.bind(this));
      
          this.didFindAll(store, type, results);

          this._listenRefs.push(ref);

          ref.on("child_added", function(child) {
            if (!this.localLock) {
              var data = child.val()
              data.id = child.name();
              this.didFindMany(store, type, [data]);
            }
          }.bind(this));

          ref.on("child_removed", function(child) {
            if (!this.localLock) {
              var id = child.name();
              var rec = store.findById(type, id);
              if (rec) {
                rec.deleteRecord();
              }
            }
          }.bind(this));

        }.bind(this));
      },

      // some day this might do some sort of deeper find
      _getRefForType: function(type) {
        var name = this.serializer.pluralize(this.serializer.rootForType(type));

        return this.fb.child(name);
      },

      destroy: function() {
        this._listenRefs.forEach(function(ref) {
          ref.off("child_added");
          ref.off("child_removed");
        });
        this._listenRefs.clear();
        this._super();
      }

    });



    __exports__.Adapter = Adapter;
  });

define("firebase/model",
  ["exports"],
  function(__exports__) {
    
    var Model = DS.Model.extend({
      getRef: function(collection) {
        var adapter = this.store.adapter;
        var serializer = adapter.serializer;

        var name = serializer.pluralize(serializer.rootForType(this.constructor));

        // find belongsTo assocations
        var key;
        Ember.get(this.constructor, 'relationshipsByName')
          .forEach(function(rkey, relation) {
            if (relation.kind == "belongsTo" && relation.parentType == this.constructor) {
              if (serializer.embeddedType(relation.type, name))
                key = rkey;
            }
          }.bind(this));

        var parentRef;
        if (key) {
          if (this.get(key)) {
            parentRef = this.get(key).getRef();
          }
          else {
            // *probably* means will be deleted
            // watch out for anything bad that could trigger this.
            return this.get("_ref");
          }
        }
        else {
          parentRef = adapter.fb;
        }

        var ref;
        if (!this.get("id")) {
          ref = parentRef.child(name).push(); // generates new id 
          this.set("id", ref.name());
        }
        else {
          ref = parentRef.child(name).child(this.get("id"));
        }

        this.set("_ref", ref);
        return ref;
      }
    });

    var LiveModel = Model.extend({
      init: function() {
        this._super();

        // a model will fire one of these two events when created
        this.on("didLoad", this._initLiveBindings.bind(this));
        this.on("didCreate", this._initLiveBindings.bind(this));
      },

      _initLiveBindings: function() {
        if (!this.get("_liveBindingsWereEnabled")) {    // sanity check
          this.set("_liveBindingsWereEnabled", true);
          var ref = this.getRef();

          // get all possible attributes that aren't relationships for check
          var attrs = Ember.get(this.constructor, "attributes");

          ref.on("child_added", function(prop) {
            if (attrs.get(prop.name()) && (this.get(prop.name()) === undefined)) {
              this.store.didUpdateAttribute(this, prop.name(), prop.val());
              this.trigger("didUpdate");
            }
          }.bind(this));
          ref.on("child_changed", function(prop) {
            if (attrs.get(prop.name()) && prop.val() !== this.get(prop.name())) {
              this.store.didUpdateAttribute(this, prop.name(), prop.val());
              this.trigger("didUpdate");
            }
          }.bind(this));
          ref.on("child_removed", function(prop) {
            // hacky: child_removed doesn't seem to be properly removed when .off() is
            // used on the reference, which can make bad things happen if the resource
            // is removed and the model no longer exists!
            if (!this.bindingsDisabled) {
              if (attrs.get(prop.name()) && (this.get(prop.name()) !== undefined || this.get(prop.name() !== null))) {
                this.store.didUpdateAttribute(this, prop.name(), null);
                this.trigger("didUpdate");
              }
            }
          }.bind(this));

          this.get("constructor.relationshipsByName").forEach(function(name, relationship) {
            if (relationship.kind == "hasMany" && relationship.options.live === true) {
              console.log("adding live relation for " + relationship.key);
              var embedded = this.store.adapter.serializer.mappingOption(this.constructor, relationship.key, "embedded");

              // embedded relationship
              if (embedded == "always") {
                ref.child(relationship.key).on("child_added", function(snapshot) {
                  var id = snapshot.name();

                  // todo: likely very inefficient. may be a better way to get
                  // list of ids - see how it's done when loading records
                  var ids = this.get(relationship.key).map(function(item) {return item.get("id")});
                  if (ids.contains(id)) { return; }

                  var data = snapshot.val();
                  var id = snapshot.name();
                  data.id = id
              
                  // find belongsTo key that matches the relationship
                  var match;
                  Ember.get(relationship.type, "relationshipsByName").forEach(function(name, relation) {
                    if (relation.kind == "belongsTo" && relation.type == relationship.parentType)
                      match = name;
                  });

                  if(match) data[match] = this;

                  // TODO: this kind of sucks. it's a workaround for didFindRecord
                  // not playing nice with associations, for whatever reason.
                  var rec = relationship.type.createRecord(data);

                  // keeps the record from being attempted to be saved back to
                  // the server
                  rec.get('stateManager').send('willCommit');
                  rec.get('stateManager').send('didCommit');

                  rec._initLiveBindings();
                }.bind(this));

                ref.child(relationship.key).on("child_removed", function(snapshot) {
                  var id = snapshot.name();

                  var rec = this.get(relationship.key).find(function(item) {return item.get("id") == id});
              
                  if (!rec) return;
              
                  rec.deleteRecord();

                  // fake sync
                  rec.get('stateManager').send('willCommit');
                  rec.get('stateManager').send('didCommit');
                }.bind(this));
              }

              else {
                ref.child(relationship.key).on("child_added", function(snapshot) {
                  var id = snapshot.name();

                  var ids = this._data.hasMany[relationship.key];
                  var state = this.get("stateManager.currentState.name");

                  // below: the magic of ember data
                  if (state === "inFlight") {return;}   // if inFlight, id will not be pushed to hasMany yet.
                  if (ids === undefined)     {return;}   // this one is pretty baffling.
                  if (ids.contains(id))     {return;}   // this one is obvious, and in a perfect world would be the only one needed.

                  var mdl = relationship.type.find(id);
              
                  this.get(relationship.key).pushObject(mdl);
                }.bind(this));

                ref.child(relationship.key).on("child_removed", function(snapshot) {
                  var id = snapshot.name();

                  var rec = this.get(relationship.key).find(function(item) {return item.get("id") == id;});
                  if (!rec) return;

                  rec.deleteRecord();
                  rec.get('stateManager').send('willCommit');
                  rec.get('stateManager').send('didCommit');
                }.bind(this));
              }
            }
          }.bind(this))
        }
      },

      deleteRecord: function() {
        this.disableBindings();
        this._super();
      },

      disableBindings: function() {
        var ref = this.getRef();
        this.bindingsDisabled = true;
        ref.off("child_added");
        ref.off("child_changed");
        ref.off("child_removed"); // Why don't you work ;_;
      }
    });

    __exports__.Model = Model;
    __exports__.LiveModel = LiveModel;
  });

define("firebase/serializer",
  ["exports"],
  function(__exports__) {
    
    var Serializer = DS.JSONSerializer.extend({

      // thanks @rpflorence's localStorage adapter 
      extract: function(loader, json, type, record) {
        this._super(loader, this.rootJSON(json, type), type, record);
      },
  
      extractMany: function(loader, json, type, records) {
        this._super(loader, this.rootJSON(json, type, 'pluralize'), type, records);    
      },

      rootJSON: function(json, type, pluralize) {
        var root = this.rootForType(type);
        if (pluralize == 'pluralize') { root = this.pluralize(root); }
        var rootedJSON = {};
        rootedJSON[root] = json;
        return rootedJSON;
      },

      rootForType: function(type) {
        var map = this.mappings.get(type)
        if (map && map.resourceName) return map.resourceName;

        return this._super(type);
      },

      extractHasMany: function(parent, data, key) {
        var items = data[key];
        var ids = [];
        for (var key in items) {
          ids.push(key);
        }
        return ids;
      },

      extractEmbeddedHasMany: function(loader, relationship, array, parent, prematerialized) { 
        var objs = [];

        // find belongsTo key that matches the relationship
        var match;
        Ember.get(relationship.type, "relationshipsByName").forEach(function(name, relation) {
          if (relation.kind == "belongsTo" && relation.type == relationship.parentType)
            match = name;
        });

        // turn {id: resource} -> [resource] with id property
        for (var key in array) {
         var obj = Ember.copy(array[key]);
         obj.id = key;
         obj[match] = parent.id;
         objs.push(obj);
        };
        this._super(loader, relationship, objs, parent, prematerialized);
      },

      // slightly modified from json serializer
      addHasMany: function(hash, record, key, relationship) {
        var type = record.constructor;
        var name = relationship.key;
        var manyArray, embeddedType;

        // Get the DS.ManyArray for the relationship off the record
        manyArray = record.get(name);

        embeddedType = this.embeddedType(type, name);

        // if not embedded, just add array of ids
        if (embeddedType !== 'always') { 
          record.getRef().child(key).once("value", function(snapshot) {
            var ids = [];
            snapshot.forEach(function (childSnap) {
              ids.push(childSnap.name());
            });

            manyArray.forEach(function (childRecord) {
              childRecord.getRef(record.get("id"));     // hacky - forces id creation
              if (!ids.contains(childRecord.get("id")))
                record.getRef().child(key).child(childRecord.get("id")).set(true);
            });
          });

          return; 
        }

        // Build up the array of serialized records
        var serializedHasMany = {};
        manyArray.forEach(function (childRecord) {
          childRecord.getRef(record.get("id"));     // hacky - forces id creation
          serializedHasMany[childRecord.get("id")] = childRecord.serialize();
        }, this);

        // Set the appropriate property of the serialized JSON to the
        // array of serialized embedded records
        hash[key] = serializedHasMany;
      },
    });


    __exports__.Serializer = Serializer;
  });
define("tmp/out", function(){});
  return require('firebase_adapter');
}));
