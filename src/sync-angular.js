/* {{{ Documentation: 
	This is intended to be a system which will operate as a normal CRUD interface while also being able to work offline in a limited capacity. It is an an instantiatable object which can be created
	as required. It stores data in local-storage and is intended to be plugged into AngularJS. 

	Offline mode:
	The overall behaviour will be: 
		- When online:
			- Get present record via ajax calls and all necessary records thereafter. 
			- Save records as they come in (optionally) to local storage, thereby providing a local fallback cache. 
			- Save normally through the services

		- When offline
			- The layer should detect that the browser is offline and get and save to local-storage instead. 
			- Records may be created and held in storage temporarily
			- Any modifications are flagged as such and prepared to be thrown to the server when back online. 
			- When pulling data from local storage, it can be constrained in a similar method to a query (useful for sub-items of one -< many relationships) 
			
		- When returning online:
			- Syncing:
				- Iterate through the list of records which have been created or modified
				- provide them to the save method which (as user specified) should send them to the server to be saved. 
				- Remove each upon saving successfully from the 'records-saved'. 
	
}}} */
// {{{ Sync object
var syncLayerFactory = function (){

	var testingOverride; //an override for online/offline testing behaviour. Should be boolean for overriding state or undefined to be in normal mode

	//Determines whether or not the browser is online. Also provides an override for testing
	var isOnline = function() {
		if(typeof testingOverride !== 'undefined') {
			console.log('online state is being overridden');
			return testingOverride;
		}
		else return navigator.onLine; 
	};

	//An index of keys
	var getIndex = function() {
		if(window.localStorage[prefix+'_index'])
			return JSON.parse(window.localStorage[prefix+'_index']);
		else return [];
	};

	//Sets the internal index of keys with a prefix
	var setIndex = function(arr) {
		if(arr)
			window.localStorage[prefix+'_index'] = JSON.stringify(arr);
	};

	//Removes the contents of the index
	var clearIndex = function(){
		delete(window.localStorage[prefix + '_index']);
	};

	//Clears all of this particular offline stored item from local storage
	var clearAll = function() {
		keys = _.keys(localStorage);

		for(var i = 0; i < keys.length; i++) {
			if(keys[i].match(prefix))	
				delete(window.localStorage[keys[i]]);
		}
	}
	
	//Adds an item to the local index
	var addToIndex = function(key) {
		var index = getIndex();
		index.push(key);
		setIndex(index);
	}

	//returns true if it finds the result in the index, false if not. 
	var existsInIndex = function(key) {
		return !!(_.find(getIndex(), function(a) {return key == a; }));
	};

	//Removes an object from the index
	var rmFromIndex = function(key) {
		index = getIndex();
		index = _.filter(index, function(el){ return key != el; });
		setIndex(index);
	};

	//String representing the index into a record representing the primary key index
	//Alternatively, can be an array of strings or intergers for compound keys. 
	var pk = null;

	//Makes a simple string from the records primary keys internally representing the compound key. Only relevant for compound keys 
	var makeCompound = function(record) {
		genKey = [];
		for(var j = 0; j < pk.length; j++ ){
			genKey.push(record[pk[j]]);
		}
		return genKey.join();
	}

	//Sets local storage
	try {
		var ls = window.localStorage;
	} catch (e) {
		console.log('Local Storage is not supported in this browser. Data cannot be saved offline');
		return false;
	}

	//This is the prefix to add to all keys being saved to in local storage. 
	var prefix = '_syncProvider_';

	//Sync method. This is called by default when the browser is determined to be back online. 
	//Its purpose is simply to iterate through the records which have been modified while offline and to 
	//throw them at the server with saveToServer(). After doing so, it should remove the records. 
	//Finally it should pull data from server to just redisplay everything and refresh any data that might have 
	//been modified by talking to the server (generation of primary keys etc).
	var sync = function(){
		var keyList = getDirty();	

		for(var i = 0; i < keyList.length; i++) {
			var record = getLS(keyList[i]);
			if(pk instanceof Array) {
				saveToServer(keyList[i].split(','), record);
			}
			else {
				if(isNewRecord(keyList[i])){
					saveToServer(null, record); //Don't send the internal random key to the server if the record's new. Let the server determine the PK
				}
				else if (isDeleted(keyList[i])) {
					
					//First delete it from the server
					deleteFromServer(keyList[i]);
					//Then remove it locally
					rmLS(keyList[i]);
				}
				else {
					saveToServer(keyList[i], record);
				}
			}
			//Now that it's sent, remove it from local storage. 
			rmLS(keyList[i]);
		}
		getAllFromServer();
	};

	//Retrieves an array of record keys for records which have been changed since last connected to the server. 
	//Does so through a simple linear search of the indexed keys.
	var getDirty = function(){
		var list = [];
		var index = getIndex();
		for(var i = 0; i < index.length; i++) {
			if(ls[prefix + index[i]]) {
				var record = JSON.parse(ls[prefix + index[i]]);
				if(record['dirty'] === true) {
					list.push(index[i]);
				}
			}
		}
		return list; 
	};

	//Function to be set as a call to the server. 
	var saveToServer = function(){console.log('saveToServer function not configured yet, check provider configuration to set this method'); }; 

	//Function to call on the server as a 'get all' of a particular record
	var getAllFromServer = function(){console.log('getAll function not set yet, check provider configuration to set this method'); };

	//Local Storage Filter
	//When doing complicated operations, its often necessary to perform queries on the server-side to constrain the data coming in. 
	//This isn't immediately possible when storing offline without considerable effort, so instead an underscore-like filter syntax is provided
	//to constrain records when being pulled from offline. 
	var lsFilter = null; 

	//Gets all local storage items. They are filtered by the lsFilter() function. 
	var getAllLS = function(params){
		var result = [];
		var index = getIndex();
		for(var i = 0; i < index.length; i++){
			var item = getLS(index[i]);
			
			//remove deleted items
			if(item && !item.deleted)
				result.push(item);
		}

		//if the local storage filter is set, perform the filter. 
		if(lsFilter) {
			var filteredResult = [];
			for(var i = 0; i < result.length; i++) {
				if(lsFilter(result[i], params)) {
					filteredResult.push(result[i]);
				}
			}
			if(postProcessingLS) {
				filteredResult = postProcessingLS(filteredResult);
			}
			return filteredResult; 
		}
		else {
			if(postProcessingLS) {
				result = postProcessingLS(result);
			}
			return result;
		}

	};

	//The function to be called when retrieving data from the server. 
	var getFromServer = function(key){
		if(key) {
			console.log('getFromServer function not set yet, check provider configuration to set this method');
		}
		else {
			console.log('No key provided, ensure that a key parameter is passed in');
		}
	};

	var deleteFromServer = function(key) {
		console.log('Delete from server method not specified. use .setDeleteFromServer()');
	};

	//get from local storage
	var getLS = function(key){
		var result = {}; 
		if(key) {
			//Because compound array keys are supported, check which and work with the type of key appropriately:
			if(key instanceof Array) {
				if(ls[prefix+key.join()]) {
					var result = JSON.parse(ls[prefix + key.join()])['record'];
					result['saKey'] = key; //Provide reference to the internal key 
					return result; 
				}
				else{ 
					return null;
				}
			}
			else {
				if(ls[prefix+key]) {
					var result = JSON.parse(ls[prefix + key])['record'];
					if(result)
						result['saKey'] = key; //Provide reference to the internal key
					return result;
				}
				else{ 
					return null;
				}
			}
				
		}
		else {
			console.log('No key provided, ensure that a key parameter is passed in');
		}
	};

	//Save to local storage
	var saveLS = function(key, data, isDirty) {
		if(key) {
			//As mentioned before, if the key's compound, it'll need to be joined to be worked with in local storage. 
			if(key instanceof Array) {

				//If it's existing, replace it and signal that it's not a new record. 
				if(existsInIndex(key.join())) {
					ls[prefix+key.join()] = JSON.stringify({dirty: isDirty, record: data, newRecord: false});
				}
				else {
					ls[prefix + key.join()] = JSON.stringify({dirty: isDirty, record: data});
					addToIndex(key.join());
				}
			} else {
				if(existsInIndex(key)) {
					ls[prefix+key] = JSON.stringify({dirty: isDirty, record: data, newRecord: false});
				}
				else {
					ls[prefix + key] = JSON.stringify({dirty: isDirty, record: data});
					addToIndex(key);
				}
			}
		}
		else {
			//If it's an entirely new record, we'll need to make a temporary primary key to work with. 
			//This is done by just generating some entropy and then storing it as a key in the index. 
			//If all goes well, the key itself will never actually be used outside this local sync object. 
			key = randKey();
			ls[prefix + key] = JSON.stringify({dirty: isDirty, record: data, newRecord: true});
			addToIndex(key);
		}
		return {
			success: function(c) {c();}
		};
	};

	//Sets an items locally to being 'deleted'. This isn't actual removal, just stops it from being listed as a valid item and to be deleted next sync
	var deleteLS = function(key) {
		if(key) {
			//As mentioned before, if the key's compound, it'll need to be joined to be worked with in local storage. 
			if(key instanceof Array) {
				if(existsInIndex(key.join())) {
					ls[prefix+key.join()] = JSON.stringify({dirty: true, deleted: true});
				}
			} else {
				if(existsInIndex(key)) {
					ls[prefix+key] = JSON.stringify({dirty: true, deleted:true});
				}
			}
		}
		return {
			success: function(c) {c(); }
		};
			
	};

	//Shorthand method to determine if the key-value is a new record
	var isNewRecord = function(key) {
		return JSON.parse(ls[prefix + key])['newRecord'];
	};

	//Specifies whether or not the record is marked for deletion
	var isDeleted = function(key) {
		return JSON.parse(ls[prefix + key])['deleted'];
	};

	//Simple generation of a little entropy for keys
	var randKey = function() {
		return parseInt(Date.now() + Math.random()*1000);
	};

	//Remove an object from local storage
	var rmLS = function(key){
		if(key) {
			if(key instanceof Array) {
				delete ls[prefix + key.join()];
				rmFromIndex(key.join());

			}else {
				delete ls[prefix + key];
				rmFromIndex(key);
			}
		}
		else {
			console.log('No key provided, ensure that a key parameter is passed in');
		}
	};

	//Function called when going offline. It exists as an optional add-on and by default does nothing. 
	var goOffline = function(){ console.log('Offline detected by Syncprovider'); };
	
	//Function called when going back online. It can be replaced, but by default is just for calling the sync method.
	var goOnline = function(){ 
		console.log('Online detected by Syncprovider'); 
		sync();
	};

	var postProcessingLS = null;

	return {
			//Optional
			//Set the sync method. By default this doesn't need config. 
			setSync: function(f) {
				sync = f;
			},
			//optional
			//set the local storage filter. This is to be provided a function which will take in the records 
			//in local storage (when in offline mode) and compare them to the parameters in the getAll() 
			//and return a true or false answer. 
			setLSFilter: function (f) {
				if(typeof f !== 'function') {
					throw 'Need to pass in a function';
				}
				lsFilter = f;
			},

			//Required
			//Set the primary key string. Required for looking up what the PK of the record is and 
			//manipulating it internally. 
			setPK: function(k) {
				pk = k;
			},

			//optional 
			//Set the internal local storage prefix to prevent collision with other instances or other local storage services. 
			setPrefix: function(p) {
				prefix = p;
			},
			
			//Required
			//The method to be called to save to the server. 
			setSaveToServer: function(f) {
				if(typeof f !== 'function') {
					throw 'Need to pass in a function';
				}
				saveToServer = f;
			},

			//required
			//The method to be called to get all records for this resource from the server. 
			//Need to pass in an object with a success() method for callbacks (such as returning result of angular's http).
			setGetAllFromServer: function(f) {
				if(typeof f !== 'function') {
					throw 'Need to pass in a function when setting a server getAll()';
				}
				getAllFromServer = f;
			},

			setDeleteFromServer: function(f) {
				if(typeof f !== 'function') {
					throw 'Need to pass in a function';
				}
				deleteFromServer = f;
			},

			//optional 
			//The method to be called when getting a specific record from the server. 
			setGetFromServer: function(f) {
				if(typeof f !== 'function') {
					throw 'Need to pass in a function';
				}
				getFromServer = f; 
			},

			//optional 
			//The method called when going offline
			setGoOffline:function(f){
				if(typeof f !== 'function') {
					throw 'Need to pass in a function';
				}
				goOffline = f;
			},

			//Optional 
			//The method called when going online. 
			setGoOnline: function(f) {
				if(typeof f !== 'function') {
					throw 'Need to pass in a function';
				}
				goOnline = f; 
			},

			//Set the post-processor for local storage
			setPostProcessLS: function(f){
				if(typeof f !== 'function') {
					throw 'Need to pass in a function';
				}
				postProcessingLS = f;
			},

			//This is the special object which will actually be used and returned by Angular's provider.
			//Dependencies are injected by the provider and listed here in the array as strings. 
			$get: function() {

				window.addEventListener("offline", function(e) {
					goOffline();
				});

				window.addEventListener("online", function(e) {
					goOnline();
				});
				
				this.sync = function() {
					sync();	
				};

				//Get a record from the server or from local storage
				//@param key string/array The primary key to search for
				this.get = function(key) {
					if(isOnline()) {
						return getFromServer(key);
					}
					else {
						return {
							success: function(c){
								c(getLS(key));
							}
						};
					}
				};

				//GetAll Set this to get all records (with constraints) from the server. 
				//@param boolean pullToLS Set this to true to pull from the server and save in local storage as a cache. 
				this.getAll = function(params, pullToLS) {

					//If not specified, default it true - users expect that this should cache 
					if(typeof pullToLS == 'undefined') {
						pullToLS = true;
					}

					if(isOnline()) {
						return getAllFromServer(params)
							.error(function(e){
								console.error(e);
							})
							.success(function(result){  
							if(result && pullToLS) {
								if(pk){
									//Iterate through the data that's come back from the server and see if it's possible to use the specified
									//PK index to work with each record and save it into local storage. 
									if(pk instanceof Array) {
										for(var i = 0; i < result.length; i++){ //make a compound primary key separated by commas
											saveLS(makeCompound(result[i]), result[i], false);
										}
									}
									else {
										for(var i = 0; i < result.length; i++){
											if(result[i][pk])
												saveLS(result[i][pk], result[i], false);
											else if(pk != null && pk != undefined) {
												console.log('Error while trying to save data locally. Appear to be a problem with PK as an index into the results. Key:', pk);
											}
										}
									}
								}
								else {
									throw ('Primary Key not configured in offline sync adapter. Use setPK() in the provider config');
								}
							}
							return {
								success: function(c){
									c(result);
								}
							};
					
						});

					}
					else {//get everything from local storage
						var result = getAllLS(params);
						return {
							success: function(c){c(result);}
						};
					}
				};

				//remove from local storage
				this.rmLS = function(key) {
					rmLS(key);
				};

				//Clear all this from localstorage
				this.clearLS = function(){
					clearAll();
				};

				//Save the record either to the server or to local storage
				this.save = function(id, data) {
					if(isOnline()) {
						return saveToServer(id, data);
					}
					else {
						return saveLS(id, data, true); 
					}
				};

				//Calls the delete mechanism or marks the item for deletion when offline. 
				this.delete = function(id) {
					if(isOnline()) {
						rmLS(id);
						return deleteFromServer(id);
					}
					else {
						return deleteLS(id); 
					}
				};

				//Allows overriding of the offline/online behaviour to enable testing
				//@param expects a single boolean to determine which mode it's in when called, ie true for online
				//alternatively when called without params, will return the current state
				this.testing = function(mode) {
					if(typeof mode === 'boolean')
						testingOverride = mode;
					return isOnline(); 
				};

				return this;
			}//end of $get
		};
};
// }}} 
