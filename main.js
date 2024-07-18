// Get references to UI elements
let connectButton = document.getElementById('connect');
let disconnectButton = document.getElementById('disconnect');
let heartButton = document.getElementById('heartButton');
let spo2Button = document.getElementById('spo2Button');
let heartNotifyButton = document.getElementById('heartNotifyButton');
let spo2NotifyButton = document.getElementById('spo2NotifyButton');
let heartStopButton = document.getElementById('heartStopButton');
let spo2StopButton = document.getElementById('spo2StopButton');
let terminalContainer = document.getElementById('terminal');
let heartContainer = document.getElementById('heartRate');
let spo2Container = document.getElementById('spo2');

// Connect to the device on Connect button click
connectButton.addEventListener('click', function(){connect();});

// Disconnect from the device on Disconnect button click
disconnectButton.addEventListener('click', function(){disconnect();});

heartButton.addEventListener('click', function(){readHeart();});
spo2Button.addEventListener('click', function(){readSpo2();});
heartNotifyButton.addEventListener('click', function(){startHeartNotifications();});
spo2NotifyButton.addEventListener('click', function(){startSpo2Notifications();});
heartStopButton.addEventListener('click', function(){stopHeartNotifications();});
spo2StopButton.addEventListener('click', function(){stopSpo2Notifications();});

// Handle form submit event
//sendForm.addEventListener('submit', function(event) {
//  event.preventDefault(); // Prevent form sending
//  send(inputField.value); // Send text field contents
//  inputField.value = '';  // Zero text field
//  inputField.focus();     // Focus on text field
//});

// Selected device object cache
let deviceCache = null;
let serviceCache = null;
let heartCharCache = null;
let spo2CharCache = null;


function requestBluetoothDevice() {
	log('Requesting bluetooth device...');
	return navigator.bluetooth.requestDevice({
		filters: [{name: "Heart Monitor"}],
		optionalServices: ['129b4828-8561-4655-aa3e-385755c50f72']}).
      then(device => {
			log('"' + device.name + '" bluetooth device selected');
			deviceCache = device;
			deviceCache.addEventListener('gattserverdisconnected', handleDisconnection);
			connectButton.disabled = true;
			disconnectButton.disabled = false;
			return deviceCache;
      });
}

function connect() {
	return (deviceCache ? Promise.resolve(deviceCache) :
		requestBluetoothDevice()).
      then(device => connectDeviceAndCacheService(device)).
		then(service => {let heartChar = service.getCharacteristic('129b4828-8561-4655-aa3e-385755c50f73');
							  let spo2Char = service.getCharacteristic('129b4828-8561-4655-aa3e-385755c50f74');
							  return Promise.all([heartChar, spo2Char])}).
		then(([heartChar, spo2Char]) => {
			heartButton.disabled = false;
			spo2Button.disabled = false;
			if (heartChar.properties.notify) 
				heartNotifyButton.disabled = false;
			if (spo2Char.properties.notify) 
				spo2NotifyButton.disabled = false;				
			heartCharCache = heartChar;
			spo2CharCache = spo2Char;
//			startHeartNotifications();											
//			startHeartNotifications();
		}).
      catch(error => log(error));
}

// Connect to the device specified and get service
function connectDeviceAndCacheService(device) {
	if (device.gatt.connected && serviceCache) {
		return Promise.resolve(serviceCache);
	}
	log('Connecting to GATT server...');
	return device.gatt.connect().
      then(server => {
        log('GATT server connected, getting service...');
        return server.getPrimaryService('129b4828-8561-4655-aa3e-385755c50f72');
      }).
		then(service => {
        log('Service found');
        serviceCache = service;
        return serviceCache;
      });
}

// Disconnect from the connected device
function disconnect() {
	if (deviceCache) {
		log('Disconnecting from "' + deviceCache.name + '" bluetooth device...');
		deviceCache.removeEventListener('gattserverdisconnected', handleDisconnection);

		if (deviceCache.gatt.connected) {
			deviceCache.gatt.disconnect();
			log('"' + deviceCache.name + '" bluetooth device disconnected');
		}
		else {
			log('"' + deviceCache.name + '" bluetooth device is already disconnected');
		}
	}
	if (heartCharCache && heartCharCache.properties.notify) {
		heartCharCache.removeEventListener('characteristicvaluechanged', handleHeartValueChanged);
		heartCharCache = null;
	}	
	if (spo2CharCache && spo2CharCache.properties.notify) {
		spo2CharCache.removeEventListener('characteristicvaluechanged', handleSpo2ValueChanged);
		spo2CharCache = null;
	}		
	deviceCache = null;
	connectButton.disabled = false;
	disconnectButton.disabled = true;
	heartButton.disabled = true;
	spo2Button.disabled = true;
	heartNotifyButton.disabled = true;
	spo2NotifyButton.disabled = true;
	heartStopButton.disabled = true;
	spo2StopButton.disabled = true;	
	heartContainer.innerHTML = "?";
	spo2container.innerHTML = "?";
}

function handleDisconnection(event) {
	let device = event.target;
	log('"' + device.name + '" bluetooth device disconnected, trying to reconnect...');
	connectDeviceAndCacheService(device).
	then(service => {let heartChar = service.getCharacteristic('129b4828-8561-4655-aa3e-385755c50f73');
						  let spo2Char = service.getCharacteristic('129b4828-8561-4655-aa3e-385755c50f74');
						  return Promise.all([heartChar, spo2Char])}).
	then(([heartChar, spo2Char]) => {
			heartButton.disabled = false;
			spo2Button.disabled = false;	
			if (heartChar.properties.notify)
				heartNotifyButton.disabled = false;
			if (spo2Char.properties.notify)
				spo2NotifyButton.disabled = false;							
			heartCharCache = heartChar;
			spo2CharCache = spo2Char;
//			startHeartNotifications();											
//			startHeartNotifications();
	}).
	catch(error => log(error));	
}

// Enable temp characteristic changes notification
function startHeartNotifications() {
	log('Starting heart rate notifications...');
	return heartCharCache.startNotifications().
      then(() => {
        log('Heart rate notifications started');
		  heartNotifyButton.disabled = true;
		  heartStopButton.disabled = false;
		  heartCharCache.addEventListener('characteristicvaluechanged', handleHeartValueChanged);
      });
}

function stopHeartNotifications() {
	log('Stopping heart rate notifications...');
	return heartCharCache.stopNotifications().
      then(() => {
        log('Heart rate notifications stopped');
		  heartNotifyButton.disabled = false;
		  heartStopButton.disabled = true;
		  heartCharCache.removeEventListener('characteristicvaluechanged', handleHeartValueChanged);
      });
}

// Enable Heart characteristic changes notification
function startSpo2Notifications() {
	log('Starting Heart rate notifications...');
	return spo2CharCache.startNotifications().
      then(() => {
        log('Heart rate notifications started');
		  spo2NotifyButton.disabled = true;
		  spo2StopButton.disabled = false;
		  spo2CharCache.addEventListener('characteristicvaluechanged', handleSpo2ValueChanged);
      });
}

function stopSpo2Notifications() {
	log('Spo2 notifications...');
	return spo2CharCache.stopNotifications().
      then(() => {
        log('Spo2 notifications stopped');
		  spo2NotifyButton.disabled = false;
		  spo2StopButton.disabled = true;		  
		  spo2CharCache.removeEventListener('characteristicvaluechanged', handleSpo2ValueChanged);
      });
}

// Temp data receiving
function handleHeartValueChanged(event) {
	let value = event.target.value.getInt16(0, true);
//	log("temp = " + value);
	heartContainer.innerHTML = value;
}
// Heart data receiving
function handleSpo2ValueChanged(event) {
	let value = event.target.value.getUint16(0, true);
//	log("Heart = " + value);
	spo2Container.innerHTML = value;
}

function readHeart() {		
  return heartCharCache.readValue().
	  then (value => heartContainer.innerHTML = value.getInt16(0, true));
}

function readSpo2() {		
  return spo2CharCache.readValue().
	  then (value => spo2Container.innerHTML = value.getUint16(0, true));
}

// Output to terminal
function log(data) {	
//	terminalContainer.insertAdjacentHTML('beforeend',
	terminalContainer.innerHTML = 
      '<div>' + data + '</div>';
}

