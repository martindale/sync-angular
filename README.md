##Sync-Angular

version 0.01
state: pre-alpha - highly unstable

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
	
#### Simple pull to server 

	conChecklistApp.factory('RoomSvc', function($http){

		//Create an instance of the sync object
		var instance = syncLayerFactory();  

		//set the primary key of this particular resource
		instance.setPK('id');

		//Set a prefix for this particular resource
		instance.setPrefix('rooms')

		//Call this method when performing a getAll() to pull data from the server if online
		instance.setGetAllFromServer(function() {
			return $http.get('/walls_ceilings/loadrooms');
		});

		//Call this method when performing a get() to get from the server. 
		instance.setGetFromServer(function(id, loc) {
			return $http.get('/walls_ceilings/room/' + id);
		});

		//Return the object for Angular to use
		return instance.$get(); 
	});



#### Save to server only

	conChecklistApp.factory('CommentSvc', function($http){

		var instance = syncLayerFactory();  
		instance.setPK('id');
		instance.setPrefix('comments');

		//Sign off the particular action, for a room, by a contractor
		instance.setSaveToServer(function(id, params) {
			return $http.post('/walls_ceilings/comments/' + params.roomid + '/' + params.loc + "/" + params.actionid, params);
		});

		return instance.$get(); 
	});


#### CRUD with compound primary key and local subquery

	conChecklistApp.factory('SignoffSvc', function($http){

		var instance = syncLayerFactory();  

		//Compound primary key to look in the records to be passed in as an array
		instance.setPK(['companyid', 'roomid', 'actionid', 'location']);

		instance.setPrefix('signoffs');

		//Filter to perform like a WHERE query, make sure this is where the records returned are equal to the 
		//the request parameters:  
		instance.setLSFilter(function(record, params){
			return record.roomid == params.id && params.loc == record['location'];
		});

		instance.setGetAllFromServer(function(params) {
			return $http.get('/walls_ceilings/checklist/' + params.id + '/' + params.loc);
		});
		
		return instance.$get(); 
	}

