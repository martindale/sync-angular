##Sync-Angular

version 0.01

A humble attempt at a transparent offline sync layer for AngularJS data-providers. The idea being to operate as a normal provider
but with the capacity to and retrieve records when the browser is detected as being offline. 

### Requirements

* AngularJS (not actually required, but doesn't really make sense to use without it)
* Underscore

### Overview
This is intended to be a system which will operate as a normal CRUD interface while also being able to work offline in a limited capacity. It is an an instantiatable object which can be created
as required. It stores data in local-storage and is intended to be plugged into AngularJS. 

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
	
### Examples of use

	var sync = new SyncObject({
		pk: 'pk', 						//Set the primary key field/s
		prefix: 'testing', 					//Give local-storage prefix
		saveToServer: function(id, data){
			console.log('saving to server id: ', id, data);  //set a function for saving to server
		},
		getAllFromServer: function(){ 				//Set a function for fetching from server
			console.log('getting from server');
		},
		deleteFromServer: function(){ 				//Set a function to delete
			console.log('getting from server');
		}
	});


	//Call this function, should fetch from server when online 
	//and fetch from local-storage when browser offline.

	sync.getAll({param: 1, param2: 'asdf'}).success(function(data){
		console.log('data from server: ', data); 
	});

	//Save, should call saveToServer() function when online or 
	//store locally when offline. Performs sync when comes back online
	sync.save(1, {data: 123}).success(function(serverData){
		console.log('reply from server save attempt', serverData);
	});
