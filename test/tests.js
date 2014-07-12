

window.localStorage.clear() //clear before starting
console.log('online?', navigator.onLine);
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

describe('Basic functionality', function(){
	
	var sa;

	beforeEach(function(){
		sa = new syncLayerFactory();
	});

	it('Should be an object which instansiates with a number of basic methods', function(){
		
		expect(typeof sa.setSync                    == 'function').toBe(true);
		expect(typeof sa.setLSFilter                == 'function').toBe(true);
		expect(typeof sa.setPK                      == 'function').toBe(true);
		expect(typeof sa.setPrefix                  == 'function').toBe(true);
		expect(typeof sa.setSaveToServer            == 'function').toBe(true);
		expect(typeof sa.setGetAllFromServer        == 'function').toBe(true);
		expect(typeof sa.setDeleteFromServer        == 'function').toBe(true);
		expect(typeof sa.setGetFromServer           == 'function').toBe(true);
		expect(typeof sa.setGoOffline               == 'function').toBe(true);
		expect(typeof sa.setGoOnline                == 'function').toBe(true);
		expect(typeof sa.setPostProcessLS           == 'function').toBe(true);
		expect(typeof sa.$get                       == 'function').toBe(true);

		//Should get an object from the $get method
		expect(typeof sa.$get()                     == 'object').toBe(true);
	});

	
});

describe('offline/online functioning and detection', function(){
	
	window.localStorage.clear() //clear before starting
	console.log('online?', navigator.onLine);
	
	var sa;
	var sync;

	beforeEach(function(){
		sa = new syncLayerFactory();
		sa.setPK('pk');
		sa.setPrefix('test');
		sa.setSaveToServer(function(data){return data; }); //Return some magic number to demonstrate it is working
		sa.setGetAllFromServer(function(){
			console.log('Server Call mock accessed');
			return dummyServerCall.array;
		})

		sync = sa.$get();
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

	window.localStorage.clear() //clear before starting
	console.log('online?', navigator.onLine);
	
	var sa;
	var sync;

	beforeEach(function(){
		sa = new syncLayerFactory();
		sa.setPK('pk');
		sa.setPrefix('test');
		sa.setSaveToServer(function(data){return data; }); //Return some magic number to demonstrate it is working
		sa.setGetAllFromServer(function(){
			console.log('Server Call mock accessed');

			var returnObject = {
				success: function(c) { c(dummyServerCall().array); return returnObject; },
				error: function(c) { c(); return returnObject; } 
			};
			
			return returnObject;
		});

		sync = sa.$get();

		//Force the sync object to be online
		sync.testing(true);
	});

	it('Should create a sync layer object with the $get()', function(){
		expect(typeof sync == 'object').toBe(true);
	});

	it('Should get all from the server', function(){
		
		sync.getAll({pk: 2, test: 1}).success(function(data){
			console.log('data from server: ', data);
			expect(data[1].pk == 2).toBe(true);
		});
	});

	it('Should allow a passthrough save to server when online as a matter of default', function(){

		
	});
});

