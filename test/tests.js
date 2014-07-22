describe('Basic functionality', function(){
	
	var sa;

	beforeEach(function(){
		sa = new SyncObject({
			pk: 'pk',
			prefix: 'testing',
			saveToServer: function(){
				console.log('saving to server');
			},
			getAllFromServer: function(){
				console.log('getting from server');
			},
			deleteFromServer: function(){
				console.log('getting from server');
			},
			lsFilter: function(object){
				return object; 
			},
			goOffline: function(){},
			goOnline: function(){},
			postProcessLS: function(){},
			lSFilter: function(){},
			sync: function(){},
		});
	});

	it('Should be an object which instansiates with a number of basic methods', function(){
		
		expect(typeof sa.sync                    == 'function').toBe(true);
		expect(typeof sa.lSFilter                == 'function').toBe(true);
		expect(typeof sa.pk                      == 'string').toBe(true);
		expect(typeof sa.prefix                  == 'string').toBe(true);
		expect(typeof sa.saveToServer            == 'function').toBe(true);
		expect(typeof sa.getAllFromServer        == 'function').toBe(true);
		expect(typeof sa.deleteFromServer        == 'function').toBe(true);
		expect(typeof sa.getFromServer           == 'function').toBe(true);
		expect(typeof sa.goOffline               == 'function').toBe(true);
		expect(typeof sa.goOnline                == 'function').toBe(true);
		expect(typeof sa.postProcessLS           == 'function').toBe(true);

	});


});

describe('offline/online functioning and detection', function(){
	
	var sync;
	
	//A dummy server call which can create some fake data
	var dummyServerCall = function(){
		return {
				array: [
					{pk: 1, text: "Record 1"},
					{pk: 2, text: "Record 2"},
				],
				object: {pk: 3, text: "Record 3"},
		};
	};

	beforeEach(function(){
		window.localStorage.clear(); //clear before starting
		sync = new SyncObject({
			pk: 'pk',
			prefix: 'testing',
			saveToServer: function(data){return data; },
			getAllFromServer: function(){
				console.log('Server Call mock accessed');
				return dummyServerCall.array;
			},
			deleteFromServer: function(){
				console.log('getting from server');
			},
			lsFilter: function(object){
				return object; 
			},
		});
	});
	
	//This assumes the computer with testing is online 
	it('Should realise that the browser is online)', function(){
		console.log('Browser is currently reporting as', sync.testing());
		expect(sync.testing()).toBe(navigator.onLine);
	});

	it('Should react correctly when online state is being overridden )', function(){
		expect(sync.testing(true)).toBe(true);
	});
	
	it('Should react correctly when online state is being overridden )', function(){
		expect(sync.testing(false)).toBe(false);
	});

});

describe('Basic functionality', function(){
	
	var sync;

	beforeEach(function(){
		window.localStorage.clear(); //clear before starting

		//A dummy server call which can create some fake data
		var dummyServerCall = function(){
			return {
					array: [
						{pk: 1, text: "Record 1"},
						{pk: 2, text: "Record 2"},
					],
					object: {pk: 3, text: "Record 3"},
			};
		};

		sync = new SyncObject({
			pk: 'pk',
			prefix: 'testing',
			saveToServer: function(key, data){
				var returnObject = {
					success: function(c) { c('success on saving to server. Key: ' + key + ' data: ' + data.data); return returnObject; },
					error: function(c) { c(); return returnObject; }  //no error, so don't put anything in the callback
				};
			
				return returnObject; 
			},
			getAllFromServer: function(){
				console.log('Server Call mock accessed');

				var returnObject = {
					success: function(c) { c(dummyServerCall().array); return returnObject; },
					error: function(c) { c(); return returnObject; }  //no error, so don't put anything in the callback
				};
			
			return returnObject;
			},
			deleteFromServer: function(){
				console.log('getting from server');
			},
			lsFilter: function(object){
				return object; 
			},
		});

		//Force the sync object to be online
		sync.testing(true);
	});

	it('Should get all from the server', function(){
		sync.getAll({pk: 2, test: 1}).success(function(data){
			expect(data[1].pk == 2).toBe(true);
		});
	});

	it('Should retain server data after going offline', function(){
		sync.getAll({pk: 2, test: 1}).success(function(data){
			expect(data[1].pk == 2).toBe(true);
		});
		
		//Go offline
		sync.testing(false);
		expect(sync.testing()).toBe(false); //expect the thing to be offline

		sync.getAll({pk: 2, test: 1}).success(function(data){
			console.log('local storage data is ', data);
			expect(data[1].pk == 2).toBe(true);

			//expect there now to be a key from SA's internals
			expect(typeof data[1].saKey !== 'undefined').toBe(true);
		});
	});

	it('Should save to the server when called and return a response back appropriately', function(){
		sync.save(1, {data: 123}).success(function(serverData){
			expect(serverData === 'success on saving to server. Key: 1 data: 123').toBe(true);
		});
	});


	it('should create a temporary primary key for an object created offline', function(){
		
		//Go offline
		sync.testing(false);
		
		sync.save(null, {name: 'testRecord'}).success(function(data){
			expect(data.pk).not.toBe(false); 
		});
	});
	
	it('Should give this temporary primary key back in all offline get requests', function(){
		
		//Go offline
		sync.testing(false);
		
		sync.save(null, {name: 'testRecord2'});
		sync.getAll().success(function(data){ 
			expect(data[0].pk).not.toBe(false);
			expect(data[0].name).toBe('testRecord2');
		});
	});

	it('Should not give the server the temporary primary key on a save', function(){
		
		//Go offline
		sync.testing(false);
		
		sync.save(null, {name: 'testRecord3'});
		expect(sync.testing()).toBe(false); //expect the thing to be offline
	});
});



