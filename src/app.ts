import express, { Express, Request, Response } from "express";
import {
    clearSessionFromStorageAll,
    getSessionFromStorage,
    getSessionIdFromStorageAll,
    Session
}  from '@inrupt/solid-client-authn-node'; 
import cookieSession from "cookie-session";
import { getSolidDataset,
    getPodUrlAll,
    createSolidDataset, 
    buildThing, 
    createThing, 
    saveFileInContainer, 
    getSourceUrl, 
    overwriteFile,
    saveSolidDatasetAt,
    addUrl,
    addStringNoLocale,
    addDate,
    setThing,
    saveSolidDatasetInContainer,
    createContainerAt,
    createContainerInContainer,
    getContainedResourceUrlAll,
    getThingAll,
    getStringNoLocale,
    toRdfJsDataset,
    getThing,
    getUrl,
    setUrl,
    setStringNoLocale,
    universalAccess,
    getIri,
    getStringNoLocaleAll,
    getDate,
    removeThing
} from '@inrupt/solid-client';
import path from "path";
import * as multer from "multer";
import _ from "lodash";
import { FOAF, SCHEMA_INRUPT, VCARD } from "@inrupt/vocab-common-rdf";
const upload = multer.default();
const PORT = process.env.PORT || 3002;
const app: Express = express();
//this uses path join with __dirname
//__dirname is the current directory of the executed file, which is necessary for the js file
//after it is compiled into the dist folder from src/app.ts
app.use('/js', express.static(path.join(__dirname, 'public/js')))
app.use(express.json());
app.use(express.urlencoded());
//this sets the views directory for the compiled app.js file in the dist folder after tpyescript has compiled
app.set('views', path.join(__dirname, '/views'))
app.set('view engine', 'pug');
//app.use(cors());
app.use(
    cookieSession({
      name: "session",
      // These keys are required by cookie-session to sign the cookies.
      keys: [
        "Required, but value not relevant for this demo - key1",
        "Required, but value not relevant for this demo - key2",
      ],
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    })
);
const session = new Session();
async function getSensorInboxResource(session: Session): Promise<string | null> {
    const webId = session.info.webId!;
    //console.log('in get sensor inbox rsc')
    try {
        let dataset = await getSolidDataset(webId, { fetch: session.fetch });
        const rdfThing = getThing(dataset, webId);
        const profileUri = getUrl(rdfThing!, FOAF.isPrimaryTopicOf);
        // dereference profile document w/ uri
        let profileDataset = await getSolidDataset(profileUri!, { fetch: session.fetch });
        console.log(profileDataset)
        // query the dataset for the user card 
        const extWebID = getThing(profileDataset, webId);
        console.log(extWebID)
        const sensorInboxUri = getStringNoLocale(extWebID!, 'http://www.example.org/sensor#sensorInbox');
        console.log(sensorInboxUri)
        //console.log('exiting get sensor fn')
        return sensorInboxUri;
    } catch (err: any) {
        throw new Error(err.message);
    }
    
}

async function createSensorInboxUri(session: Session, sensorInboxUri: string): Promise<string> {
    console.log(sensorInboxUri);
    const webId = session.info.webId!;
   // console.log(webId)
    try {
    let dataset = await getSolidDataset(webId, { fetch: session.fetch });
    console.log(dataset);
    const rdfThing = getThing(dataset, webId);
    console.log('passed')
    const profileUri = getUrl(rdfThing!, FOAF.isPrimaryTopicOf);
    await universalAccess.setPublicAccess(profileUri!, { read: true, write: false }, { fetch: session.fetch})
    
    // dereference profile document w/ uri
    let profileDataset = await getSolidDataset(profileUri!, { fetch: session.fetch });
    console.log('passed 3')
    
    const SPACE_PREFIX = "http://www.w3.org/ns/pim/space#";
    const STORAGE_SUBJ = `${SPACE_PREFIX}storage`;
    const storageUri = getUrl(rdfThing!, STORAGE_SUBJ);
    // query the dataset for the user card 
    const pWebID = getThing(profileDataset, webId);
    //update the card with the public type index type (predicate) and location (object)
    const newPWebID = setStringNoLocale(pWebID!, "http://www.example.org/sensor#sensorInbox", `${storageUri}${sensorInboxUri}`);
    profileDataset = setThing(profileDataset, newPWebID)
    console.log('passed 4')
    
    // save the profile with the new public type index in the card
    
    const newProfile = await saveSolidDatasetAt(profileUri!, profileDataset, { fetch: session.fetch });
    console.log(newProfile)
    const podSensorInboxUri = `${storageUri}${sensorInboxUri}`
    console.log(podSensorInboxUri); 
    const newSensorInboxContainer = await createContainerAt(podSensorInboxUri, { fetch: session.fetch });
    console.log(newSensorInboxContainer);
    const newAccess = await universalAccess.setPublicAccess(podSensorInboxUri, { append: true, read: false }, { fetch: session.fetch });
    if (newAccess) {
        console.log('success')
    }
    return '/home'
    } catch (err) {
        console.error(err);
        return '/error'
    }
}

app.get('/', (req: Request, res: Response) => {
    res.render('index.pug')
})

async function getStorageUri(session: Session): Promise<string> {
    const webId = session.info.webId!;
    try {
        const data = await getSolidDataset(webId, {fetch: session.fetch});
        const webIdThing = getThing(data, webId);
        const storageUri = getUrl(webIdThing!, 'http://www.w3.org/ns/pim/space#storage');
        if (storageUri) {
            return storageUri;
        } else {
            throw new Error('No storage uri found in webId document.')
        }
    } catch (err: any) {
        throw new Error(err.message)
    }
    
}

async function getSensorContacts(storageUri: string, session: Session) {
    const sensorContactsUri = `${storageUri}contacts/sensorContacts`;
    try {
        const data = await getSolidDataset(sensorContactsUri, { fetch: session.fetch })
        const contacts = getThingAll(data);
        return contacts;
    } catch (err: any) {
        console.log(err);
        try {
            let newData = createSolidDataset();
            const data = await saveSolidDatasetAt(sensorContactsUri, newData, { fetch: session.fetch }); 
            console.log('created new Dataset!');
            const contacts = getThingAll(data);
            return contacts;
        } catch (err: any) {
            throw new Error(err.toString())
        }
    }
}

app.get('/add_sensor_contacts', async (req: Request, res: Response) => {
    const session = await getSessionFromStorage((req.session as CookieSessionInterfaces.CookieSessionObject).sessionId);
    if (session) {
        try {
            const storageUri = await getStorageUri(session);
            const contacts = await getSensorContacts(storageUri, session);
            if (contacts) {
                let parsedContacts: any = [];
                for (const contact of contacts) {
                    let o: any = {};
                    const dateAdded = getDate(contact, "https://www.example.com/contact#addedDate");
                    const webId = getIri(contact, "https://www.exampe.com/contact#webId");
                    o.webId = webId;
                    o.dateAdded = dateAdded;
                    parsedContacts.push(o);
                }
                res.render('add_sensor_contacts.pug', {contacts: parsedContacts})
            } else {
                res.render('add_sensor_contacts.pug')
            }
        } catch (err) {
            res.redirect('/error')
        }
    } else {
        res.redirect('/error');
    }
})

app.post('/add_sensor_contacts', upload.none(), async (req: Request, res: Response) => {
    const session = await getSessionFromStorage((req.session as CookieSessionInterfaces.CookieSessionObject).sessionId);
    if (session) {
        console.log(req.body);
        try {
          const storageUri = await getStorageUri(session);
          const sensorContactsUri = `${storageUri}contacts/sensorContacts`;
          let data = await getSolidDataset(sensorContactsUri, { fetch: session.fetch });
          let newContact = buildThing(createThing({name: req.body.webId}))
            .addDate("https://www.example.com/contact#addedDate", new Date())
            .addIri("https://www.exampe.com/contact#webId", req.body.webId as string)
            .build();
          data = setThing(data, newContact);
          await saveSolidDatasetAt(sensorContactsUri, data, { fetch: session.fetch });
          console.log("successfully saved contacts dataset!");
          const sensorInboxResourceUri = await getSensorInboxResource(session)
          const access = universalAccess.setAgentAccess(sensorInboxResourceUri!, req.body.webId, { write:false, read: true}, { fetch: session.fetch })
          if (await access) {
            console.log('access set successfully')
            res.redirect('/add_sensor_contacts');
          } else {
            throw new Error('something went wrong with setting access');
          }
          
        } catch (err) {
            console.log(err);
            res.redirect('/error')
        }
    } else {
        res.redirect('/error');
    }
})

app.post("/login", upload.none(), (req: Request, res: Response) => {
    (req.session as CookieSessionInterfaces.CookieSessionObject).oidcIssuer = req.body.oidcIssuer;
    res.redirect('/login');
})

app.get("/login", async (req: Request, res: Response) => {
    
    const oidcIssuer = (req.session as CookieSessionInterfaces.CookieSessionObject).oidcIssuer;
    (req.session as CookieSessionInterfaces.CookieSessionObject).sessionId = session.info.sessionId;
    const redirectToSolidIdentityProvider = (url: string) => {
        res.redirect(url);
    };
    try {
        await session.login({
            redirectUrl: `http://localhost:${PORT}/redirect-from-solid-idp`,
            oidcIssuer: oidcIssuer,
            clientName: "SOLID-if-IoT Client App",
            handleRedirect: redirectToSolidIdentityProvider,
        });
    } catch (err) {
        res.redirect('/');
    }
});
  
app.get("/redirect-from-solid-idp", async (req, res) => {
    const session = await getSessionFromStorage((req.session as CookieSessionInterfaces.CookieSessionObject).sessionId);

    await (session as Session).handleIncomingRedirect(`http://localhost:${PORT}${req.url}`);

    if ((session as Session).info.isLoggedIn) {
        res.redirect('/home');
    }
});


app.get('/home', async (req: Request, res: Response) => {
    const session = await getSessionFromStorage((req.session as CookieSessionInterfaces.CookieSessionObject).sessionId);
    if (session) {
        console.log('hello')
        let sensorInboxResource;
        try {
            sensorInboxResource = await getSensorInboxResource(session);
        } catch (err) {
            console.log('first error')
            //console.log(err);
            res.redirect('/config');
        }
        
        if (sensorInboxResource) {
            const webId = session.info.webId!;
            console.log(webId)
            let dataset: any;
            try {
                //console.log('in try block')
                dataset = await getSolidDataset(webId, { fetch: session.fetch });
            } catch (err) {
                console.log(err)
                
                const podSensorInboxUri = `${sensorInboxResource as string}`
                dataset = await createContainerAt(podSensorInboxUri, { fetch: session.fetch});
                //console.log(podSensorInboxUri);
                const newAccess = await universalAccess.setPublicAccess(`${sensorInboxResource}`, { append: true, read: false}, { fetch: session.fetch });
                if (newAccess) {
                    console.log('success')
                }
            }
            const sensorDatasets = await getSolidDataset(`${sensorInboxResource}`, {fetch: session.fetch});
            const sensorThingUrls = getContainedResourceUrlAll(sensorDatasets);
            let sensorThings: any = [];
            for (const sensorThingUrl of sensorThingUrls) {
                const sensorThingData = await getSolidDataset(sensorThingUrl, { fetch: session.fetch });
                const sThings = getThingAll(sensorThingData);
                    
                for (const sThing of sThings) {
                    const newThing: any = {};
                    //console.log(sThing)
                    const topicsUri = getIri(sThing, "https://www.example.org/sensor#topicsUri")
                    const topicsDataset = await getSolidDataset(topicsUri!, { fetch: session.fetch});
                    const topicsThings = getThingAll(topicsDataset);
                    let subscribeTopics: any = []
                    let publishTopics: any = []
                    for (const topic of topicsThings) {
                        console.log(topic)
                        let sTopics = getStringNoLocaleAll(topic, "https://www.example.org/sensor#subscribeTopic")
                        let pTopics = getStringNoLocaleAll(topic, "https://www.example.org/sensor#publishTopic")
                        let newPubTopics: any = [];
                        for (const topic of pTopics) {
                            newPubTopics.push({'status': 'unpublished', topic})
                        }
                        let newSubTopics: any = [];
                        for (const topic of sTopics) {
                            newSubTopics.push({'status': 'unsubscribed', topic})
                            console.log(topic);
                        }
                        if (newPubTopics.length > 0) publishTopics.push(...newPubTopics)
                        if (newSubTopics.length > 0) subscribeTopics.push(...newSubTopics)
                    }
                    newThing.subscribeTopics = subscribeTopics;
                    newThing.publishTopics = publishTopics;
                    newThing.topicsUri = topicsUri;
                    newThing.brokerUri = getUrl(sThing, "https://www.example.org/sensor#brokerUri")
                    newThing.sensorUri = getStringNoLocale(sThing, "https://www.example.org/sensor#sensorUri")
                    newThing.name = getStringNoLocale(sThing, "https://www.example.org/sensor#name");
                    sensorThings.push(newThing);
                } 
                    
            }
            const subscribedTopicsUri = `${await getStorageUri(session)}public/subscribedTopics`;
            let data;
            try {
                data = await getSolidDataset(subscribedTopicsUri, { fetch: session.fetch }) 
            } catch (err) {
                console.log(err)
                let newData = createSolidDataset();
                try {
                    data = await saveSolidDatasetAt(subscribedTopicsUri, newData, { fetch: session.fetch})
                } catch (err: any) {
                    throw new Error(err.message);
                }
            }
            const subscribedTopics = getThingAll(data);
            const subscribedTopicsIds = subscribedTopics.map(thing => getStringNoLocale(thing, 'https://www.example.org/identifier#fullTopicString'))
            if (subscribedTopics.length > 0) {
                for (const sensorThing of sensorThings) {
                    for (let h = 0; h < sensorThing.subscribeTopics.length; h++) {
                        const compareString = `${sensorThing.brokerUri}+${sensorThing.subscribeTopics[h].topic}`
                        console.log(compareString);
                        for (let i = 0; i < subscribedTopicsIds.length; i++) { 
                            if (compareString === subscribedTopicsIds[i]) {
                                sensorThing.subscribeTopics[h].status = 'subscribed';
                                break;
                            }
                        }
                    }
                }
            }
            console.log(sensorThings);
            res.render('home.pug', {sensorData: sensorThings})
        } else {
            res.redirect('/config')
        }
        
    } else {
        res.render('error.pug')
    }
})

app.post('/create_config', upload.none(), async (req: Request, res: Response) => {
    console.log(req.body);
    const session = await getSessionFromStorage((req.session as CookieSessionInterfaces.CookieSessionObject).sessionId)
    if (session?.info.isLoggedIn) {
        const uri = await createSensorInboxUri(session, req.body.sensorInboxUri)
        res.redirect(uri);
    }
})

app.post('/subscribe', async (req: Request, res: Response) => { 
    console.log(req.body);
    //res.redirect('/home');
    const session = await getSessionFromStorage((req.session as CookieSessionInterfaces.CookieSessionObject).sessionId)
    if (session) {
        try {
            const subscribedTopicsUri = `${await getStorageUri(session)}public/subscribedTopics`;
            let subscribedTopicsData = await getSolidDataset(subscribedTopicsUri, { fetch: session.fetch })
            //const subscribedtopicsThings = getThingAll(subscribedTopicsData);
            const newSubscribeTopic = buildThing(createThing())
              .addStringNoLocale('https://www.example.org/identifier#fullTopicString', `${req.body.uri}+${req.body.topic}`)
              .build();
            subscribedTopicsData = setThing(subscribedTopicsData, newSubscribeTopic);
            const newSet = await saveSolidDatasetAt(subscribedTopicsUri, subscribedTopicsData, { fetch: session.fetch});
            console.log(newSet);
            res.status(200).send();
        } catch(err) {
            console.log(err);
            res.status(404).send();
        }   
    }
})

app.post('/unsubscribe', async (req: Request, res: Response) => {
    console.log(req.body);
    //res.redirect('/home');
    const session = await getSessionFromStorage((req.session as CookieSessionInterfaces.CookieSessionObject).sessionId)
    if (session) {
        try {
            const subscribedTopicsUri = `${await getStorageUri(session)}public/subscribedTopics`;
            let subscribedTopicsData = await getSolidDataset(subscribedTopicsUri, { fetch: session.fetch })
            const subscribedTopicsThings = getThingAll(subscribedTopicsData);
            const thingToDelete = subscribedTopicsThings.filter(t => getStringNoLocale(t, 'https://www.example.org/identifier#fullTopicString') === `${req.body.uri}+${req.body.topic}`)
            subscribedTopicsData = removeThing(subscribedTopicsData, thingToDelete[0]);
            const newSet = await saveSolidDatasetAt(subscribedTopicsUri, subscribedTopicsData, { fetch: session.fetch});
            console.log(newSet);
            res.status(200).send();
        } catch(err) {
            console.log(err);
            res.status(404).send();
        }   
    }
})

app.get('/error', (req, res) => {
    res.render('error.pug');
});

app.get('/config', async (req: Request, res: Response) => {
    const session = await getSessionFromStorage((req.session as CookieSessionInterfaces.CookieSessionObject).sessionId)
    if (session?.info.isLoggedIn) {
        try {
            const sensorInboxUri = await getSensorInboxResource(session);
            if (sensorInboxUri) {
                res.render('update_cfg.pug')
            } else {
                res.render('config.pug')
            }
            
        } catch (error) {
            console.log(error);
            res.redirect('/error')
        }
    }
});

app.get('/logout', async (req: Request, res: Response) => {
    if (typeof req.session === undefined || typeof req.session === null) {
        res.render('error.pug')
    } else {
        const session = await getSessionFromStorage((req.session as CookieSessionInterfaces.CookieSessionObject).sessionId)
        if (session?.info.isLoggedIn) {
            await session.logout();
        }
        res.render('logged_out.pug')
    }
})

app.listen(PORT, () => {
    console.log(`Server started on port: ${PORT}`)
})