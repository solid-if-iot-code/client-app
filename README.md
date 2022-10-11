# client-app
This is the Client Application Interface portion of the SOLID-if-IoT architecture. The /home endpoint will render resources if you have registered a sensor container URI.

**You must go to the /home endpoint which redirects to the config endpoint, or directly to the config endpoint on login and create a resource of the patter {word}/{word}/.**
Otherwise, the steward app will not be able to properly retrieve your profile to locate the sensor resource.

The templating engine used was pug, and are located in /views. Associated public files are located in public/js.

If there are any concerns, feel free to make a pull request and clone as you like.

ENDPOINTS OF INTEREST:
sensor resource: https://storage.inrupt.com/2783617b-ddec-4849-a356-06a4529d6409/sensorInbox/

profile document: https://storage.inrupt.com/2783617b-ddec-4849-a356-06a4529d6409/profile

sensor contactS: https://storage.inrupt.com/2783617b-ddec-4849-a356-06a4529d6409/contacts/sensorContacts

test data: https://storage.inrupt.com/2783617b-ddec-4849-a356-06a4529d6409/mqttdata/testdata
