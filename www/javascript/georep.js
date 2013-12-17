// Spazio dei nomi
var georep = {
	// sezione relativa a costanti utilizzate nel resto del codice
	constants: {
		/* vettore contenente l'elenco dei designDoc usati */
		designDocs: [
			{
				name: 'queries', /* nome di questo design document */
				handlers: [ /* vettore dei gestori delle diverse views */
					{
						name: '_view', /* gestore delle views map-reduce */
						views: ['allDocsByUser'] /* elenco delle views gestite da questo gestore */
					},
					{
						name: '_spatial', /* gestore delle views spaziali di geocouch */
						views: ['allDocsByLoc'] /* elenco delle views spaziali */
					}
				]
			}
		],
		// queste info sono utilizzate per comporre l'URL utilizzato nell'invio
        // delle richieste di signup 
        nodeJsServer: {
                proto: 'http',
                host: '192.168.0.111',
                port: 1337
        }
	},
	// sezione relativa al database remoto
	db: {
		configured: false, /* indica se DB e' stato configurato */
		name: undefined, /* nome del db */
		host: undefined, /* IP o Hostname della macchin */
		port: undefined, /* porta sulla quale il server e' in ascolto */
		proto: undefined, /* protocollo di comunicazione (http://, https://, ecc...) */
		/**
		 * controlla se tutte le properties del DB sono state configurate e ritorna
		 * tale risultato.
		 */
		isConfigured: function(){
			if (this.configured)
				return true;
			else {
				this.configured = (
					this.name  !=  undefined && this.host  != undefined &&
					this.port  !=  undefined && this.proto != undefined
				);
				return this.configured;
			}
		},
		/**
		 * Setta il nome del database all'interno del server.
		 *
		 * DBName ( string ):
		 */
		setDBName: function(DBName){
			if (arguments.length != 1) {
				throw 'setDBName() richiede un argomento: DBName (string).';
			} else if (!DBName || typeof DBName != 'string' ) {
				throw 'Impossibile settare il nome del database, parametro non valido.';
			} else {
				georep.db.name = DBName;
				georep.db.isConfigured();
			}
		},
		/**
		 * Configura lo URL del server CouchDB (geocouch)
		 *
		 * URLServer ( object ):
		 *     {
		 *         proto: "http://",
		 *         host:  "127.0.0.1",
		 *         port:  5984
		 *     }
		 */
		setURLServer: function(URLServer){
			if (arguments.length != 1){
				throw 'setURLServer() richiede un argomento: URLServer (object).';
			} else if (typeof URLServer != 'object'){
				throw 'Impossibile settare "URLServer", parametro non valido.';
			} else if (
			!URLServer.proto || typeof URLServer.proto != 'string' ||
			!URLServer.host  || typeof URLServer.host  != 'string' ||
			!URLServer.port  || typeof URLServer.port  != 'number' ||
			URLServer.port < 1 || URLServer.port > 65535){
				throw 'Impossibile settare "URLServer", uno o piu\' properties non valide.';
			} else {
				georep.db.proto = URLServer.proto;
				georep.db.host = URLServer.host;
				georep.db.port = URLServer.port;
				georep.db.isConfigured();
			}
		},
		/**
		 * Recupera un doc dal database tramite il relativo ID
		 * 
		 * docId: (string) "l'ID del documento",
		 * attachments: (boolean)
		 *     true  - recupera il documento completo di allegato;
		 *     false - recupera il semplice documento senza allegato.
		 * callback ( function(err, data) ):
		 *     funzione di callback chiamata sia in caso di errore che di successo;
		 *        err:  oggetto che descrive l'errore, se si e' verificato;
		 *        data: oggetto che mostra le opzioni settate se non si sono verificati errori.
		 */ 
		getDoc: function(docId, attachments, callback){
			if( arguments.length < 2 )
				throw 'getDoc() richiede almeno 2 argomenti: docId (string), attachment (boolean).';
			else if (!docId || typeof docId != 'string' || typeof attachments != 'boolean')
				throw 'Uno o piu\' parametri non validi.';
			else {
				var attach = (attachments)?'?attachments=true':'?attachments=false';
				$.ajax({
					url: georep.db.proto +
						 georep.db.host + ':' +
						 georep.db.port + '/' +
						 georep.db.name + '/' + docId +
						 attach,
					headers: {
						Authorization: 'Basic ' + georep.user.base64,
						/* mi assicura che la risposta arrivi con l'allegato in base64
				           invece che in binario in un oggetto MIME a contenuti multipli
				        */ 
						Accept: 'application/json'	
					},
					success: function(data){
						if(callback)
							callback(undefined,data);
					},
					error: function(jqXHR, textStatus, errorThrown){
						if(callback)
							callback({jqXHR: jqXHR, textStatus: textStatus, errorThrown: errorThrown},undefined);
					}
				});
			}
		},
		/**
		 * Chiede al DB tutti i documenti che sono posizionati in una certa area
		 * rettangolare.
		 *
		 * bl_corner (object): coordinate del vertice in basso a sinistra del
		 *     rettangolo.
		 * tr_corner (object): coordinate del vertice in alto a destra del
		 *     rettangolo.
		 * callback ( function(err, data) ): funzione chiamata al termine della
		 *     richiesta al server. In caso di errore, 'err' contiene un oggetto
		 *     che descrive l'errore altrimenti 'data' contiene il risultato
		 *     della query.
		 *
		 * entrambi i vertici sono oggetti del tipo:
		 *     {
		 *         lng: (number),
		 *         lat: (number)
		 *     }
		 */
		getDocsInBox: function(bl_corner, tr_corner, callback){
			var viewPath = georep.constants.designDocs[0].name + '/' +
			               georep.constants.designDocs[0].handlers[1].name + '/' +
			               georep.constants.designDocs[0].handlers[1].views[0];
			var queryOpts = '?bbox=' +
				                bl_corner.lng + ',' + bl_corner.lat + ',' +
				                tr_corner.lng + ',' + tr_corner.lat;
			
			if (arguments.length < 2)
				throw 'getDocsInBox() richiede due argomenti: bl_corner (object), tr_corner (object).';
			else if (typeof bl_corner != 'object' || typeof tr_corner != 'object')
				throw 'Uno o piu\' parametri non validi: devono essere \'object\'.';
			else if (
			!bl_corner.lng || typeof bl_corner.lng != 'number'|| bl_corner.lng < -180 || bl_corner.lng > 180 ||
			!bl_corner.lat || typeof bl_corner.lat != 'number'|| bl_corner.lat <  -90 || bl_corner.lat >  90  )
				throw 'Parametro non valido: bl_corner.';
			else if (
			!tr_corner.lng || typeof tr_corner.lng != 'number'|| tr_corner.lng < -180 || tr_corner.lng > 180 ||
			!tr_corner.lat || typeof tr_corner.lat != 'number'|| tr_corner.lat <  -90 || tr_corner.lat >  90  )
				throw 'Parametro non valido: tr_corner.';
			else if (arguments.length > 2 && (!callback || typeof callback != 'function'))
				throw 'Parametro opzionale non valido: callback.';
			else if (!georep.db.isConfigured())
				throw 'Impossibile contattare il database: db non cofigurato';
			else if (!georep.user.isConfigured())
				throw 'Impossibile inviare la richiesta al server da un utente non configurato.';
			else {
				$.ajax({
					url: georep.db.proto + georep.db.host + ':' + georep.db.port + '/' +
						 georep.db.name + '/_design/' + viewPath + queryOpts,
					type: 'GET',
					headers: {
						Accept: 'application/json',
						Authorization: 'Basic ' + georep.user.base64
					},
					success: function(data){
						if(callback)
							callback(undefined, data);
					},
					error: function(jqXHR, textStatus, errorThrown){
						if(callback)
							callback({jqXHR: jqXHR, textStatus: textStatus, errorThrown: errorThrown},undefined);
					}
				});
			}
		},
		/**
		 * Chiede al DB tutti gli ID dei documenti creati da un utente.
		 *
		 * userId (string): identificatore unico di un utente.
		 * callback ( function(err, data) ): funzione chiamata al termine della
		 *     richiesta al server. In caso di errore, 'err' contiene un oggetto
		 *     che descrive l'errore altrimenti 'data' contiene il risultato
		 *     della query.
		 */
		getUserDocs: function(userId, callback){
			var viewPath = georep.constants.designDocs[0].name + '/' +
			               georep.constants.designDocs[0].handlers[0].name + '/' +
			               georep.constants.designDocs[0].handlers[0].views[0];
			var queryOpts = '?key="' + userId + '"';
			
			if (arguments.length < 1)
				throw 'getUserDocs() richiede almeno un argomento: userId (string).';
			else if (!userId || typeof userId != 'string')
				throw 'parametro non valido: userId deve essere una stringa non vuota.';
			else if (arguments.length > 1 && typeof callback != 'function')
				throw 'parametro opzionale non valido: callback deve essere una funzione.';
			else if (!georep.db.isConfigured())
				throw 'Impossibile contattare il database: db non cofigurato';
			else if (!georep.user.isConfigured())
				throw 'Impossibile inviare la richiesta al server da un utente non configurato.';
			else {
				$.ajax({
					url: georep.db.proto + georep.db.host + ':' + georep.db.port + '/' +
						 georep.db.name + '/_design/' + viewPath + queryOpts,
					type: 'GET',
					headers: {
						Accept: 'application/json',
						Authorization: 'Basic ' + georep.user.base64
					},
					success: function(data){
						if(callback)
							callback(undefined, data);
					},
					error: function(jqXHR, textStatus, errorThrown){
						if(callback)
							callback({jqXHR: jqXHR, textStatus: textStatus, errorThrown: errorThrown},undefined);
					}
				});
			}
		},
		/**
		 * Invia un nuovo documento sul database remoto
		 * 
		 * doc (object) :
		 *     {
		 *         title: (string) "titolo del documento",
		 *         msg: (string) "qualche dettaglio in piu'",
		 *         img: (object) {
		 *                           content_type: "image/...",
		 *                           data: "... data in base64 ..."
		 *                       }
		 *         loc: (object) {
		 *                           latitude:  (number) latitudine nord,
		 *                           longitude: (number) longitudine est
		 *                       }
		 *     }
		 * callback ( function(err, data) ):
		 *     funzione di callback chiamata sia in caso di errore che di successo;
		 *        err:  oggetto che descrive l'errore, se si e' verificato;
		 *        data: oggetto che mostra le opzioni settate se non si sono verificati errori.
		 */ 
		postDoc: function(doc,callback){
			if( arguments.length < 1 )
				throw 'postDoc() richiede almeno 1 argomento: doc (object).';
			else if ( typeof doc != 'object' ||
			!doc.title || typeof doc.title != 'string' ||
			!doc.msg   || typeof doc.msg   != 'string' ||
			!doc.img   || typeof doc.img   != 'object' ||
			!doc.img.content_type || typeof doc.img.content_type != 'string' ||
			!doc.img.data         || typeof doc.img.data         != 'string' ||
			!doc.loc || typeof doc.loc != 'object' ||
			!doc.loc.latitude  || typeof doc.loc.latitude  != 'number' || doc.loc.latitude  >  90 || doc.loc.latitude  <  -90 ||
			!doc.loc.longitude || typeof doc.loc.longitude != 'number' || doc.loc.longitude > 180 || doc.loc.longitude < -180 ){
				throw 'Parametro "doc" non valido.';
			} else {
				var newDoc = {};
				newDoc.userId = georep.user._id;
				newDoc.title = doc.title;
				newDoc.msg = doc.msg;
				newDoc.loc = doc.loc;
				newDoc._attachments = {
					img: doc.img
				};
				$.ajax({
					url: georep.db.proto + georep.db.host + ':' +
						 georep.db.port + '/' + georep.db.name,
					type: 'POST',
					dataType: 'json',
					contentType: 'application/json',
					data: JSON.stringify(newDoc),
					headers: {Authorization: 'Basic ' + georep.user.base64},
					success: function(data){
						if(callback)
							callback(undefined,data);
					},
					error: function(jqXHR, textStatus, errorThrown){
						if(callback)
							callback({jqXHR: jqXHR, textStatus: textStatus, errorThrown: errorThrown},undefined);
					}
				});
			}
		}
	},
	// sezione relativa all'utente che utilizza il DB
	user: {
		_id: undefined, /* identificatore unico associato all'utente */
		base64: undefined, /* credenziali dell'utente utilizzate per il login sul DB codificate in 'base64' */
		configured: false, /* indica se l'utente e' stato configurato */
		mail: undefined, /* indirizzo email dell'utente */
		name: undefined, /* username utilizzato dall'utente per l'autenticazione sul DB */
		nick: undefined, /* nickname arbitrariamente scelto dall'utente */
		password: undefined, /* password usata dall'utente per l'autenticazione sul DB */
		roles: [], /* ruoli dell'utente sul DB; deve essere [] */
		type: 'user', /* tipo dell'utente; deve essere 'user' */
		/**
		 * Controlla se un utente è registrato sul server CouchDB (geocouch).
		 * 
		 * callback ( function(err, data) ):
		 * 		funzione di callback, NON OPZIONALE, chiamata sia in caso di errore che di successo;
		 *         err: oggetto che descrive l'errore, se si è verificato;
		 *        data: true se l'utente è già registrato, false se non lo è .
		 */
		check: function(callback){
			/* callback è obbligatorio perchè checkUser() chiama $.ajax() che è asincrona */
			if( arguments.length != 1 || typeof callback != 'function'){
				throw 'checkUser() richiede un argomento: callback (function(err, data)).';	
			} else if (!this.isConfigured()){
				throw 'Impossibile controllare se l\'utente e\' registrato: utente non configurato.';
			} else if (!georep.db.isConfigured()){
				throw 'Impossibole controllare se l\'utente e\' registrato: server non configurato.';
			} else {
				/* richiedo info sul db, usando come credenziali di accesso quelle dell'utente georep.options.user, 
				   se l'accesso al db viene negato, significa che l'utente non è registrato */
				$.ajax({
					url: georep.db.proto + georep.db.host + ':' + georep.db.port,
					type: 'GET',
					headers: {
						'Authorization': 'Basic ' + georep.user.base64
					},
					success: function(data){
						/*console.log("Utente gia' registrato "+ data);*/
						callback(undefined, {isRegistered: true});
					},
					error: function(jqXHR, textStatus, errorThrown){
						/*console.log('jqXHR: '+ jqXHR + '\ntextStatus: '+textStatus + '\nerrorThrown: '+errorThrown);*/
						if (errorThrown == 'Unauthorized') {
							/*console.log("Utente NON registrato");*/
							callback(undefined, {isRegistered: false});
						} else {
							callback({
								err: 'Impossibile capire se l\'utente e\' registrato',
								jqXHR: jqXHR,
								textStatus: textStatus,
								errorThrown: errorThrown
							}, undefined);
						}
					}
				});
			}
		},
		/** 
		 * Recupera le informazioni d'utente dal server.
		 *
		 * callback ( function(err, data) ):
		 * 		funzione di callback, NON OPZIONALE, chiamata sia in caso di errore che di successo;
		 *         err: oggetto che descrive l'errore, se si è verificato;
		 *        data: (object) le info sull'utente
		 *              {
		 *                  _id:             (string)
		 *                  _rev:            (string)
		 *                  derived_key:     (string)
		 *                  iterations:      (number)
		 *                  mail:            (string)
		 *                  name:            (string)
		 *                  nick:            (string)
		 *                  password_scheme: (string)
		 *                  roles:           (array)
		 *                  salt:            (string)
		 *                  type:            (string)
		 *              }
		 */
		getRemote: function(callback){
			/* callback è obbligatorio perchè checkUser() chiama $.ajax() che è asincrona */
			if( arguments.length != 1){
				throw 'getRemote() richiede un argomento: callback (function(err, data)).';	
			} else if (typeof callback != 'function'){
				throw 'Parametro non valido: callback deve essere \'function\'.';
			} else {
				$.ajax({
					url: georep.db.proto + georep.db.host + ':' +
						 georep.db.port + '/_users/' + georep.user._id,
					tyep: 'GET',
					headers: {
						Accept: 'application/json',
						Authorization: 'Basic ' + georep.user.base64
					},
					dataType: 'json',
					success: function(data){
						callback(undefined, data);
					},
					error: function(jqXHR, textStatus, errorThrown){
						callback({jqXHR: jqXHR, textStatus: textStatus, errorThrown: errorThrown}, undefined);
					}
				});
			}
		},
		/**
		 * controlla se tutte le properties dell'user sono state configurate e ritorna
		 * tale risultato.
		 */
		isConfigured: function(){
			if (this.configured)
				return true;
			else {
				this.configured = (
					this._id != undefined  && this.base64 != undefined &&
					this.mail != undefined && this.name != undefined &&
					this.nick != undefined && this.password != undefined &&
					this.roles != undefined && this.type != undefined
				);
				return this.configured;
			}
		},
		/**
		 * Configura l'utente client.
		 * 
		 * user ( object ):
		 *     {
		 *         name:     (string) nome utilizzato per il login,
		 *         password: (string) password utlizzata per il login,
		 *         nick:     (string) nome arbitrario scelto dall'utente,
		 *         mail:     (string) indirizzo e-mail dell'utente
		 *     }
		 */ 
		set: function(user){
			if (arguments.length != 1){
				throw 'setUser() richiede un argomento: user (object).';
			} else if (typeof user != 'object') {
				throw 'Impossibile settare "user", parametro non valido.';
			} else if (
			!user.name      || typeof user.name      != 'string' ||
			!user.password  || typeof user.password  != 'string' ||
			!user.nick      || typeof user.nick      != 'string' ||
			!user.mail      || typeof user.mail      != 'string' ){
				throw 'Impossibile settare "user", uno o piu\' properties non valide.';
			} else {
				georep.user._id  = 'org.couchdb.user:'+user.name;
				georep.user.name = user.name;
				georep.user.password = user.password;
				georep.user.base64 = btoa(user.name+':'+user.password);
				georep.user.nick = user.nick;
				georep.user.mail = user.mail;
				georep.user.type = 'user';
				georep.user.roles = [];
				this.isConfigured();
			}
		},
		/**
		 * Registra l'utente sul server CouchDB(questa funzione dovrà essere fatta poi dal server direttamente)
		 *
		 * callback ( function(err, data) ):
		 *     funzione di callback chiamata sia in caso di errore che di successo;
		 *        err:  oggetto che descrive l'errore, se si e' verificato;
		 *        data: oggetto che mostra il messaggio ricevuto se non si sono verificati errori.
		 */
		signup: function(callback){
			if( arguments.length == 1 && typeof callback != 'function' ) {
				throw 'Il parametro opzionale deve essere una funzione';
			} else {
				$.ajax({
					url: georep.constants.nodeJsServer.proto + "://" + georep.constants.nodeJsServer.host + ':' +
						 georep.constants.nodeJsServer.port + '/_users',
					type: 'POST',
					data: JSON.stringify({
						_id:  georep.user._id,
						name: georep.user.name,
						password: georep.user.password,
						nick: georep.user.nick,
						mail: georep.user.mail,
						type: georep.user.type,
						roles: georep.user.roles
					}),
					headers: {
						'Authorization': 'Basic ' + georep.user.base64
					},
					success: function(data){
						/*console.log("Utente registrato con successo! " +data);*/
						if (callback) {
							callback(undefined, data);
						}
					},
					error: function(jqXHR, textStatus, errorThrown){
						/*console.log("Utente NON registrato! " + jqXHR + textStatus + errorThrown);*/
						if (callback){
							callback({jqXHR: jqXHR, textStatus: textStatus, errorThrown: errorThrown}, undefined);
						}
					}
				});
			}
		},
		/**
		 * Aggiorna l'utente corrente sia in locale che sul DB.
		 *
		 * user (object): deve essere un utente valido per 'georep.user.set()'
		 * callback ( function(err, data) ):
		 *     funzione di callback chiamata sia in caso di errore che di successo;
		 *        err:  oggetto che descrive l'errore, se si e' verificato;
		 *        data: oggetto che mostra il messaggio ricevuto se non si sono verificati errori.
		 */
		update: function(user, callback){
			if (arguments.length < 1){
				throw 'update() richiede un argomento: user (object).';
			} else if (typeof user != 'object') {
				throw 'Impossibile aggiornare l\'utente, parametro non valido.';
			} else if (
			!user.name      || typeof user.name      != 'string' ||
			!user.password  || typeof user.password  != 'string' ||
			!user.nick      || typeof user.nick      != 'string' ||
			!user.mail      || typeof user.mail      != 'string' ){
				throw 'Impossibile settare "user", uno o piu\' properties non valide.';
			} else if (arguments.length > 1 && typeof callback != 'function') {
					throw 'Il parametro opzionale deve essere una funzione';
			} else if (!georep.user.isConfigured()) {
					throw 'Utente corrente non configurato.';
			} else if (!georep.db.isConfigured()) {
					throw 'Impossibile contattare il database: server non configurato.';
			} else {
				this.getRemote(function(err,data){
					if(!err){
						var rev = data._rev;
						$.ajax({
							url: georep.db.proto + georep.db.host + ':' +
								 georep.db.port + '/_users/' + georep.user._id +
								 '?rev=' + rev,
							type: 'PUT',
							headers: {
								Authorization: 'Basic ' + georep.user.base64
							},
							dataType: 'json',
							data: JSON.stringify({
								name: user.name,
								password: user.password,
								nick: user.nick,
								mail: user.mail,
								type: georep.user.type,
								roles: georep.user.roles
							}),
							success: function(data){
								georep.user.set(user);
								georep.user.isConfigured();
								/*console.log("Utente registrato con successo! " +data);*/
								if (callback) {
									callback(undefined, data);
								}
							},
							error: function(jqXHR, textStatus, errorThrown){
								/*console.log("Utente NON registrato! " + jqXHR + textStatus + errorThrown);*/
								if (callback){
									callback({jqXHR: jqXHR, textStatus: textStatus, errorThrown: errorThrown}, undefined);
								}
							}
						});
					}else{
						if (callback){
							callback(err, undefined);
						}
					}
				});
			}
		}
	}
};

