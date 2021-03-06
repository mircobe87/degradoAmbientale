/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
 
/**
 * inizializza un applicazione KendoUI Mobile dal body della pagina e
 * all'inizializzazione naviga alla view delle impostazioni dell'utente
 */
var app = new kendo.mobile.Application($(document).body,{
    init: function () {
	    app.navigate('#user-view');
	}
});

// controlla lo stato di connessione del dispositivo
app.checkConnection = function () {
    var networkState = navigator.connection.type;

    var states = {};
    states[Connection.UNKNOWN]  = true;
    states[Connection.ETHERNET] = true;
    states[Connection.WIFI]     = true;
    states[Connection.CELL_2G]  = true;
    states[Connection.CELL_3G]  = true;
    states[Connection.CELL_4G]  = true;
    states[Connection.CELL]     = true;
    states[Connection.NONE]     = false;

    return states[networkState];
};
// ------- sezione MAPPA -------------------------------------------------------

/**
 * Le immagini dei segnaposto rispettivamente per:
 *  - posizione attuale
 *  - posizione delle segnalazioni dell'utente
 *  - posizione delle segnalazioni degli altri utenti
 */
app.MYLOC_MARKER = 'img/male-2.png';
app.MYDOCS_MARKER = 'img/radiation.png';
app.OTHERDOCS_MARKER = 'img/radiation-white.png';

/**
 * Riferimento alla mappa una volta istanziata
 */
app.map;

/**
 * Riferimento al segnaposto della posizione attuale
 */
app.markMyLoc;

/** 
 * Vettore dei marker delle segnalazioni sulla mappa
 */
app.markers = [];

/**
 * Riferimento al markCluster della mappa una volta istanziato.
 */
app.markCluster;

/**
 * Inizializza la mappa nel DOM con centro al 'Polo Fibonacci', successivamente
 * crea un segnaposto per la posizione attuale e lo setta ancora sul 'Polo
 * Fibonacci'; a questo punto si accede alla posizione vera e si aggiorna il 
 * centro della mappa e la posizione del segnaposto alla posizione attuale.
 */
app.initMap = function(e){
	//console.log("initmap");
	//alert("InitMap");

    if (app.map == undefined){
        /** elemento nel DOM che conterra' la mappa */
        var mapElement = $("#map")[0];

        /** configurazione della mappa */
        var mapOptions = {
            center: new google.maps.LatLng(43.720741,10.408413),
            zoom: 10
        };

        /** istanzia la mappa */
        app.map = new google.maps.Map(mapElement, mapOptions);
        //console.log('mappa istanziata');
        /*app.geoMarker = new GeolocationMarker(app.map);*/

        /** configurazione del segnaposto per la posizione attuale */
        var markOptions = {
            clickable: false,
            flat: true,
            icon: app.MYLOC_MARKER,
            map: app.map,
            position: new google.maps.LatLng(43.720741,10.408413)
        };

        /** istanzio il segnaposto per la posizione attuale */
        app.markMyLoc = new google.maps.Marker(markOptions);

        /** configurazione del markClaster */
        var markClusterOptions = {
            averageCenter: true,
            gridSize: 24
        };

        /** istanzion un markCluster per la mappa senza segnaposti */
        app.markCluster = new MarkerClusterer(app.map,[],markClusterOptions);

        /**
         * recupera la posizione attuale e riposizione il centro della mappa e il
         * segnaposto.
         */
        navigator.geolocation.getCurrentPosition(function(pos){
            var lat = pos.coords.latitude;
            var lng = pos.coords.longitude;
            var myPosition = new google.maps.LatLng(lat,lng);
            /* posizione sulla quale centrare la mappa. se app.repoCoords.latitude != undefined allora la mappa è stata caricata partendo dalla view del dettaglio
               della segnalazione, e quindi la mappa deve essere centrata sulla segnalazione. altrimenti la mappa deve essere centrata sulla posizione dell'utente
             */
            var centerPosition = app.repoCoords.latitude != undefined ? new google.maps.LatLng(app.repoCoords.latitude,app.repoCoords.longitude) : myposition;
            console.log("initMap(): getCurrentPosition... OK");
            console.log("               lat: " + lat + " Nord");
            console.log("               lng: " + lng + " Est ");
            app.map.setCenter(centerPosition);
            app.markMyLoc.setPosition(myPosition);
        },function(error){
            console.log("initMap(): getCurrentPosition... ERROR");
            console.log("               code:    " + error.code);
            console.log("               message: " + error.code);
            if (error.code == PositionError.TIMEOUT) {
                // da gestire se si usa la posizione accurata.
            }else{
                alert("Impossibile ottenere la posizione.\nControllare impostazioni GPS.");
            }
        },{
            maximumAge: 15000,
            timeout: 5000,
            enableHighAccuracy: false
        });

        /**
         * aggiorna il contenuto della mappa quando e' in 'idle' ovvero dopo
         * ogni spostamento o zoom
         */
        google.maps.event.addListener(app.map,'idle',app.updateMap);
    }
};

/**
 * Rimuove tutti i marker dalla mappa e dalla memoria.
 */
app.clearMap = function(){
	for( var i=0, len=app.markers.length; i<len; i++){
		app.markers[i].setMap(undefined);
	}
	/** cancella i riferimenti dei marker */
	app.markers.length = 0;
	/** elimina i riferimenti che il claster ha dei marker */
	app.markCluster.clearMarkers();
};

/**
 * Setta lo handler dell'evento 'click' dei segnaposto per le segnalazioni.
 *
 * marker (google.maps.Marker)
 */
app.setUpMarkerClick = function(marker){
	/** handler dell'evento */
	var onClickHandler = function(){
		app.query.docId = marker.docId;
		app.query.userId = marker.userId;
		//console.log("docId: " + marker.docId);
		//console.log("userId: " + marker.userId);
		app.navigate('#view-repoDetail');
	};
	/** setta lo handler per l'evento */
	google.maps.event.addListener(marker, 'click', onClickHandler);
};
	
/**
 * Aggiorna i marker sulla mappa.
 */
app.updateMap = function(){
	//console.log('hai mosso la mappa');
	/**
	 * rileva i limiti visualizzati nella mappa e costruisce i 2 angoli
	 * di riferimento per inoltrare la richiesta al server
	 */
	var mapBound = app.map.getBounds();
	var bl_corner = {
		lat: mapBound.getSouthWest().lat(),
		lng: mapBound.getSouthWest().lng()
	};
	var tr_corner = {
		lat: mapBound.getNorthEast().lat(),
		lng: mapBound.getNorthEast().lng()
	};

	/**
	 * chiedo al server tutte le segnalazioni che stanno sull'area
	 * della mappa visualizzata
	 */
	//georep.db.setDBName('testdb');
	georep.db.getDocsInBox(bl_corner, tr_corner, function(err, data){
		if(err){
			alert('updateMap: Impossibile contattare il server');
		}else{
			/** elimino i vecchi markers */
			app.clearMap();
			
			/** setta l'handler dell'evento click per un marker */
			
			//console.log(data);
			/**
			 * per ogni documento che il server mi ha inviato io creo un
			 * marker, lo metto nel vettore e gli configuro un handler per
			 * l'evento click.
			 */
			for(var i=0, len=data.rows.length; i<len; i++){
				/** configurazioni per il nuovo marker */
				var markerOpt = {
					map: app.map,
					/**
					 * docId: property ausiliaria utile per quando si clicchera'
					 * sul marker: in questo modo possiamo chiedere al
					 * server il Doc tramite il suo ID
					 */
					docId: data.rows[i].id,
					/**
					 * userId: property ausiliaria utile per quando si clicchera'
					 * sul marker: in questo modo possiamo chiedere al
					 * server nick e mail dell'utente tramite userId
					 */
					userId: data.rows[i].value.userId,
					position: new google.maps.LatLng(
						/** latitudine  (asse y) */
						data.rows[i].geometry.coordinates[1],
						/** longitudine (asse x) */ 
						data.rows[i].geometry.coordinates[0] 
					),
					icon: (data.rows[i].value == georep.user._id) ? app.MYDOCS_MARKER : app.OTHERDOCS_MARKER 
				};
				//console.log("marker[" + i + "]: ");
				//console.log(markerOpt);
				/** metto il nuovo marker nel vettore */
				app.markers[i] = new google.maps.Marker(markerOpt);
				//console.log("marker "+i+" fatto");
				
				/** setto il marker per rispondere all'evento di 'click' */
				app.setUpMarkerClick(app.markers[i]);
			}
			/** aggiungo i marker al cluster */
			app.markCluster.addMarkers(app.markers);
		}
	});
};

app.viewMapShow = function (){
	google.maps.event.trigger(map, "resize");
};
// sezione della LISTA SEGNALAZIONI --------------------------------------------

/* dataSource per la listView */
app.customerDataSource = new kendo.data.DataSource({ });
	
/* oggetto che contiene i campi userId e docId di una particolare segnalazione*/
app.query = {
	docId: "",
	userId: ""
};

/* crea la listView per contenere le segnalazioni dell'utente */
app.createViewList = function (){
	$("#listViewContent").kendoMobileListView({
		dataSource: app.customerDataSource,
		click: function(e) {
			 /* Ogni elemento della lista è un oggetto del tipo {id: ..., key: ..., value: ...}
			 */
			app.query.docId = e.dataItem.id;
			app.query.userId = e.dataItem.key;
		    /* devo aprire la view per la visualizzazione completa della segnalazione con id e.dataItem.id */
		    app.navigate("#view-repoDetail");
		},
		/* in questo modo all'interno della lista viene visualizzato solo il campo value 
		 * (cioè il titolo della segnalazione). 
		 */
		template: "<h5>#:value#</h5>"
	}); 
};

/* prende i titoli, di tutte le segnalazioni, disponibili in locale, effettuate dall'utente.
 */
app.getDataFromLocal = function(){
    if(localStorage.getItem(app.MYREPOLIST) != null){
        app.customerDataSource.data(JSON.parse(localStorage.getItem(app.MYREPOLIST)));
    }
    else{
        app.customerDataSource.data([]);
    }
    console.log(app.customerDataSource);
}
/* prende i titoli, di tutte le segnalazioni effettuate dall'utente, dal server couchdb. 
 * Poi li inserisce nella listView */
app.getDataFromServer = function(){
    app.startWaiting();
	/* questo if serve per provare l'app in modalità non connessa sul browser */
	/*if (app.nonConnesso == true){
        if(localStorage.getItem(app.MYREPOLIST) != null)
            app.lastRepDataSource.data(JSON.parse(localStorage.getItem(app.MYREPOLIST)));
        else
            app.lastRepDataSource.data([]);
         console.log(app.customerDataSource);
         console.log("Non c'è connessione di rete.");
	}*/
    /* se non c'è connessione di rete si prende la lista locale delle segnalazioni */
    if (app.checkConnection() == false){
        app.getDataFromLocal();
        console.log("Non c'è connessione di rete.");
        app.stopWaiting();
    }
    /* se c'è connessione di rete si prende la lista delle segnalazioni da remoto e poi si aggiorna quella locale */
	else {
        console.log("c'è connessione di rete");
		georep.db.setDBName(georep.db.name);
		georep.db.getUserDocs(georep.user._id, function(err, data){
			if (err != undefined){
                app.getDataFromLocal();
                console.log("Impossibile contattare il server. Lista caricata da locale: ");
                console.log("\t" + JSON.stringify(err));
                app.stopWaiting();
			}
			else{
				/* inserisce i dati contenuti in data.rows nella listView.
				 * data.rows è il vettore restituito dalla getUserDocs in caso di successo.
				 * Ogni elemento del vettore è del tipo {id: ..., key: ..., value: ...}
				 */
				app.customerDataSource.data(data.rows);
                console.log("DATA ROWS");
                console.log(data.rows);
                localStorage.setItem(app.MYREPOLIST, JSON.stringify(data.rows));
                console.log("Dati salvati nel localStorage");
                console.log(localStorage.getItem(app.MYREPOLIST));
                app.stopWaiting();
			}
		});
	}

};

/* permette di ottenere un indirizzo a partite da una latitudine e una longitudine */
app.coordsToAddress = function (lat, lng, callback){
	var latlng = new google.maps.LatLng(lat, lng);
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({'latLng': latlng}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
    	  callback(results[0].formatted_address);
      } else {
        alert("Errore Server");
      }
    });
};

app.decToSes = function(dec){
    var n = Math.abs(dec);
    var sgn = (dec >= 0) ? "" : "-";

    var g = Math.floor(n);
    var p = Math.floor((n-g)*60);
    var s = (((n-g)*60-p)*60).toFixed(3);

    return sgn + g + "° " + p + "\' " + s + "\"";
};

/* conterrà le coordinate della segnalazione della quale si stanno visualizzando i dettaglio*/
app.repoCoords = {};
/* carica la segnalazione completa */
app.loadRepo = function(e){
     var downloaded = []; //vettore necessario per capire se sono stati scaricati sia i dati del segnalatore sia la segnalazione
     georep.db.setDBName('testdb');
     /** avvio l'animazione di caricamento */
     app.startWaiting();

    // mette window in ascolto dell'evento repoDownloaded in modo da terminare l'animazione quando sia i dati che l'immagine della segnalazione sono stati scaricati
    function setListener() {
        $(window).on("repoDownloaded", function (evt, which) { // which: stringa che identifica chi ha scatenato l'evento
            downloaded.push(which);
            console.log("evento repoDownloaded catturato: " + downloaded);
            if (downloaded.length == 2) {
                console.log("Scaricati sia dati segnalatore sia segnalazione. Terminare animazione caricamento");
                downloaded = [];
                app.stopWaiting();
                $(window).unbind("repoDownloaded");
            }
        });
    }
    setListener();

    function printFileError(error) {
        switch (error.code) {
            case FileError.NOT_FOUND_ERR:
                console.log("\tNot found error");
                break;
            case FileError.SECURITY_ERR:
                console.log("\tSecurity error");
                break;
            case FileError.ABORT_ERR:
                console.log("\tAbort error");
                break;
            case FileError.NOT_READABLE_ERR:
                console.log("\tNot readable error");
                break;
            case FileError.ENCODING_ERR:
                console.log("\tEncoding error");
                break;
            case FileError.NO_MODIFICATION_ALLOWED_ERR:
                console.log("\tNo modification allowed error");
                break;
            case FileError.INVALID_STATE_ERR:
                console.log("\tInvalide state error");
                break;
            case FileError.SYNTAX_ERR:
                console.log("\tSyntax error");
                break;
            case FileError.INVALID_MODIFICATION_ERR:
                console.log("\tInvalid modification error");
                break;
            case FileError.QUOTA_EXCEEDED_ERR:
                console.log("\tQuota exceeded error");
                break;
            case FileError.TYPE_MISMATCH_ERR:
                console.log("\tType mismatch error");
                break;
            case FileError.PATH_EXISTS_ERR:
                console.log("\tPath exists error");
                break;
        }
    }

    function getRepoImg(newFileName, remoteAttachmentUrl, data){
        requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSystem){
            // funzione chiamata in caso sia stato ottenuto un filesystem con successo
            // creo una directory (se non esiste già) nella quale salvare l'immagine scattata dalla fotocamera
            console.log("FileSystem open with name: " + fileSystem.name);
            fileSystem.root.getDirectory(app.NAME_DIR_IMG, {create: true}, function(parent){
                // funzione chiamata in caso sia stato possibile creare la directory
                // salvo l'immagine in questa dir
                console.log("Directory open/create");
                /* crea un file con nome newFileName */
                parent.getFile(newFileName, {create: true}, function(fileEntry){
                    console.log("file created with name: " + fileEntry.name);

                    var fileTransfer = new FileTransfer();
                    var uri = remoteAttachmentUrl;
                    var filePath = fileEntry.fullPath;

                    fileTransfer.download(
                        uri,
                        filePath,
                        function(entry) {
                            console.log("download complete: " + entry.fullPath);
                            $("#repoImg").attr("src", entry.fullPath);
                            console.log("Segnalazione da salvare in locale: " + JSON.stringify(data));
                            app.coordsToAddress(data.loc.latitude, data.loc.longitude, function(indirizzo){
                                var address = indirizzo == "" ? "Non disponibile" : indirizzo;
                                $("#indirizzo").text(indirizzo);
                                /* salvo la segnalazione letta nel database locale */
                                app.segnalazioneLocale.indirizzo = indirizzo;
                                app.segnalazioneLocale._id = app.query.docId;
                                app.segnalazioneLocale.title = data.title;
                                app.segnalazioneLocale.msg = data.msg;
                                app.segnalazioneLocale.img = filePath;
                                app.segnalazioneLocale.date = data.date;
                                app.segnalazioneLocale.loc.latitude = data.loc.latitude;
                                app.segnalazioneLocale.loc.longitude = data.loc.longitude;

                                localStorage.setItem(app.segnalazioneLocale._id, JSON.stringify(app.segnalazioneLocale));
                            });
                            $(window).trigger("repoDownloaded", "repo");
                        },
                        function(error) {
                            $(window).trigger("repoDownloaded", "repo");
                            alert("Errore Server: impossibile ottenere l'immagine");
                            $("#repoImg").attr("src", "img/reloadPhoto.png");
                            $("#repoImg").unbind("click");
                            $("#repoImg").on("click", function(e){
                                //nome file dove verrà salvata l'immagine della segnalazione
                                var remoteAttachmentUrl = encodeURI(georep.db.proto + georep.db.host + ":" + georep.db.port + "/" + georep.db.name + "/" + app.query.docId + "/" + app.ATTACHMENT_REMOTE_NAME);
                                setListener();
                                $(window).trigger("repoDownloaded", "reporter");
                                app.startWaiting();
                                getRepoImg(newFileName, remoteAttachmentUrl, data);
                            });
                            /* rimuovo il file che doveva contenere l'immagine in quanto non  sono riuscito a salvarcela */
                            resolveLocalFileSystemURI(filePath, function (fileToRemove){
                                fileToRemove.remove();
                                console.log("getRepoImg() - File: " + filePath + " rimosso perchè non vi è stata salvata nessuna foto");
                            }, function (err){
                                console.log("getRepoImg() - Impossibile rimuovere il file " + filePath + " .\n\tErrore: " + err.code);
                                printFileError(error);
                            });
                            if (error.code == FileTransferError.FILE_NOT_FOUND_ERR){
                                console.log("Error: file not found");
                            }
                            else if (error.code == FileTransferError.INVALID_URL_ERR){
                                console.log("Error: invalid url");
                            }
                            else if (error.code == FileTransferError.CONNECTION_ERR){
                                console.log("Error: connection");
                            }
                            else {
                                console.log("Error: abort");
                            }
                            console.log("download error source " + error.source);
                            console.log("download error target " + error.target);
                        },
                        false,
                        {
                            headers: {
                                "Authorization": " Basic " + georep.user.base64
                            }
                        }
                    );


                }, function(error){
                    alert("Errore Filesystem: impossibile scaricare l'immagine");
                    $("#repoImg").attr("src", "img/reloadPhoto.png");
                    $(window).trigger("repoDownloaded", "repo");
                    console.log("Impossible open/create file. Error: ");
                    /*console.log(error.code);*/
                    printFileError(error);
                });
            }, function(error){
                alert("Errore Filesystem: impossibile scaricare l'immagine");
                $("#repoImg").attr("src", "img/reloadPhoto.png");
                $(window).trigger("repoDownloaded", "repo");
                console.log("Impossible open/create directory. Error: ");
                /*console.log(error.code);*/
                printFileError(error);
            });
        }, function(error){
            alert("Errore Filesystem: impossibile scaricare l'immagine");
            $("#repoImg").attr("src", "img/reloadPhoto.png");
            $(window).trigger("repoDownloaded", "repo");
            console.log("impossible open fileSystem. Error: ");
            /*console.log(error.code);*/
            printFileError(error);
        });
    }

    /** ottengo i dati della segnalazione **/
    /* provo a prendere la segnalazione dal database locale */
    var repo = localStorage.getItem(app.query.docId);

    if (repo == null){
        // segnalazione non presente in locale
        console.log("Segnalazione con id: " + app.query.docId + " non presente in cache\nProvo a scaricare la segnalazione dal server");
        //provo a leggere i dati dal server
        georep.db.getDoc(app.query.docId, false, function(err, data){
            if (err != undefined){
                console.log("***Errore Server***");
                console.log("\t" + JSON.stringify(err));
                app.stopWaiting();
                $(window).unbind("repoDownloaded");
                app.navigate('#last-view');
                alert("Impossibile scaricare segnalazione. Prova più tardi");
                return;
            }
            else {

                 var remoteAttachmentUrl = encodeURI(georep.db.proto + georep.db.host + ":" + georep.db.port + "/" + georep.db.name + "/" + app.query.docId + "/" + app.ATTACHMENT_REMOTE_NAME);
                 var d = new Date();
                 var n = d.getTime();
                 //nome file dove verrà salvata l'immagine della segnalazione
                 var newFileName = n + ".jpeg";

                 $("#descrizione").text(data.msg);
                 $("#repoDetail-title").text(data.title);
                 $("#data").text(app.dateToString(data.date));
                 $("#latitudine").text(app.decToSes(data.loc.latitude) + " °N");
                 $("#longitudine").text(app.decToSes(data.loc.longitude) + " °E");

                 /* setto le coordinate della segnalazione scaricata in modo da centrare la mappa in tali coordinate se premuto l'apposito tasto*/
                 app.repoCoords.latitude = data.loc.latitude;
                 app.repoCoords.longitude = data.loc.longitude;

                 app.coordsToAddress(data.loc.latitude, data.loc.longitude, function(indirizzo){
                     var address;
                     address = indirizzo == "" ? "Non disponibile" : indirizzo;
                     $("#indirizzo").text(address);
                     /* salvo la segnalazione letta nel database locale */
                     app.segnalazioneLocale.indirizzo = address;
                     app.segnalazioneLocale._id = app.query.docId;
                     app.segnalazioneLocale.title = data.title;
                     app.segnalazioneLocale.msg = data.msg;
                     app.segnalazioneLocale.img = newFileName;
                     app.segnalazioneLocale.date = data.date;
                     app.segnalazioneLocale.loc.latitude = data.loc.latitude;
                     app.segnalazioneLocale.loc.longitude = data.loc.longitude;

                     localStorage.setItem(app.segnalazioneLocale._id, JSON.stringify(app.segnalazioneLocale));
                 });
                getRepoImg(newFileName, remoteAttachmentUrl, data);
    	    }
	    });
    } else {
     	// segnalazione presente in cache
     	var jsonRepo = JSON.parse(repo);

        /* setto le coordinate della segnalazione scaricata in modo da centrare la mappa in tali coordinate se premuto l'apposito tasto*/
     	app.repoCoords.latitude = jsonRepo.loc.latitude;
        app.repoCoords.longitude = jsonRepo.loc.longitude;

     	//setto il contenuto della view
		console.log("Segnalazione con id: " + app.query.docId + " presente in cache: ");
		console.log(JSON.stringify(jsonRepo));
		$("#descrizione").text(jsonRepo.msg);
		$("#repoDetail-title").text(jsonRepo.title);
        resolveLocalFileSystemURI(jsonRepo.img, function (fileToLoad){
            $("#repoImg").attr("src", jsonRepo.img);
            console.log("Immagine Caricata Correttamente da locale");
        }, function (err){
            console.log("Immagine locale non disponibile... Viene caricata l'immagine di default");
            $("#repoImg").attr("src", "img/reloadPhoto.png");
            $("#repoImg").unbind("click");
            $("#repoImg").on("click", function(e){
                //nome file dove verrà salvata l'immagine della segnalazione
                var fileName = new Date().getTime() + ".jpeg";
                console.log("E' stato richiesto di tentare nuovamente di scaricare la foto.\nLa foto verrà eventualmente salvata nel file di nome: " + fileName);
                var remoteAttachmentUrl = encodeURI(georep.db.proto + georep.db.host + ":" + georep.db.port + "/" + georep.db.name + "/" + app.query.docId + "/" + app.ATTACHMENT_REMOTE_NAME);
                setListener();
                $(window).trigger("repoDownloaded", "reporter");
                app.startWaiting();
                getRepoImg(fileName, remoteAttachmentUrl, jsonRepo);
            });
        });

		$("#indirizzo").text(jsonRepo.indirizzo);
		$("#data").text(app.dateToString(jsonRepo.date));
        $("#latitudine").text(app.decToSes(jsonRepo.loc.latitude) + " °N");
        $("#longitudine").text(app.decToSes(jsonRepo.loc.longitude) + " °E");
        console.log("stopWaiting()");
        $(window).trigger("repoDownloaded", "repo");

    }
    
     /** ottengo nick e mail di chi ha effettuato la segnalazione **/
     georep.db.setDBName('_users');
     georep.db.getDoc(app.query.userId, false, function(err, data){
        if (err != undefined){
        	var user = localStorage.getItem(app.query.userId);
        	
        	if (user == null){
        		console.log("Dati sull'utente con id: " + app.query.userId + " impossibile recuperarli dal server e non presenti in cache");
                $("#nickName").text("Non disponibile");
                $("#mail").text("Non disponibile");
                $(window).trigger("repoDownloaded", "reporter");
        	}
        	else{
        		console.log("Dati segnalatore disponibili in locale: \n" + user);
        		var jsonUser = JSON.parse(user);
                $("#nickName").text(jsonUser.nick);
                $("#mail").text(jsonUser.mail);
                $(window).trigger("repoDownloaded", "reporter");
        	}

            console.log("messaggio di errore del server: ");
            console.log("\t" + JSON.stringify(err));
        }
        else {
            console.log("Dati segnalatore recuperati dal server: \n" + JSON.stringify(data));
            $("#nickName").text(data.nick);
            $("#mail").text(data.mail);

            /* memorizzo in locale i dati dell'utente che ha effettuato la segnalazione */
            app.utenteRepoLocale._id = app.query.userId;
            app.utenteRepoLocale.nick = data.nick;
            app.utenteRepoLocale.mail = data.mail;
            localStorage.setItem(app.query.userId, JSON.stringify(app.utenteRepoLocale));
            console.log("Dati segnalatore salvati in locale: \n" + localStorage.getItem(app.query.userId));
            $(window).trigger("repoDownloaded", "reporter");
        }
     });

     georep.db.setDBName('testdb');
};

/* centra la mappa alle coordinate della segnalazione della quale si sta visualizzando il dettaglio */
app.jumpToMap = function(){
    console.log("jumpToMap(): {latitudine: " + app.repoCoords.latitude + " longitude: " + app.repoCoords.longitude + "}");
    var repoPosition = new google.maps.LatLng(app.repoCoords.latitude,app.repoCoords.longitude);
    if (app.map == undefined){
        // se la mappa non è mai stata inizializzata ci navigo semplicemente, in quanto la init map capirà da sola
        // che la mappa va centrata sulle coordinate app.repoCoords
        app.navigate("#map-view");
        app.map.setZoom(18);
    }
    else{
        // se la mappa è già stata inizializzata allora la centro nelle coordinate repoPosition e poi ci navigo.
        app.map.setCenter(repoPosition);
        app.map.setZoom(18);
        app.navigate("#map-view");
    }

}
/* funzione che ripulisce i campi della view all'uscita dalla view stessa */
app.hideRepo = function(){
	$("#nickName").text("");
	$("#mail").text("");
	$("#descrizione").text("");
	$("#repoDetail-title").text("");
	$("#indirizzo").text("");
	$("#repoImg").attr("src", "img/placeholder.png");
    $("#data").text("");
    $("#latitudine").text("");
    $("#longitudine").text("");
};
/*-------------------------Sezione vista segnalazione ------------------------*/
app.segnalazione = {
	title: "",
	msg: "",
	img: {
		content_type: "",
		data: ""
	},
	loc: {
		latitude: "",
		longitude: ""
	}
};
/* oggetto rappresentante una segnalazione memorizzata in locale */
app.segnalazioneLocale = {
	_id: "",
	title: "",
	msg: "",
	img: "",
    loc: {
        latitude: "",
        longitude: ""
    },
    date: "",
	indirizzo: ""
};

/* oggetto rappresentate nick e mail degli utenti le cui segnalazioni sono memorizzate in locale */
app.utenteRepoLocale = {
	_id: "",
	nick: "",
	mail: ""
};

/* URI temporaneo della foto appena scattata per la segnalazione */
app.tmpUri = "";
/* Nome */
app.ATTACHMENT_REMOTE_NAME = "img";
/* Nome cartella contenente le foto locali */
app.NAME_DIR_IMG = "degradoAmbientaleCache";

/** 
 * avvia l'app fotocamera per scattare la foto da segnalare, se non ci sono errori, l'anteprima della foto viene 
 * mostrata nella pagina di segnalazione.
 */ 

app.getPhoto = function(){
	var cameraOptions = {
          quality: 25,
		  destinationType : Camera.DestinationType.FILE_URI, // con DATA_URL viene restituita la stringa in base64
		  sourceType : Camera.PictureSourceType.CAMERA,
		  encodingType: Camera.EncodingType.JPEG,
		  targetWidth: 2048,
		  targetHeight: 2048
		  /*saveToPhotoAlbum: true*/
	};
	navigator.camera.getPicture(
			/* funzione chiamata quando lo scatto della foto ha avuto successo */
			function(imageData){
                app.tmpUri = imageData;
				console.log("getPhoto(): Foto scattata");
                console.log("            uri: " + imageData);
				$("#imgToRepo").attr("src", imageData);
			}, 
			/* funzione chiamata quando lo scatto della foto NON ha avuto successo */
			function(message){
				console.log(message);
			}, cameraOptions);
};

/* disabilita un button con id = id */
app.disableButton = function (id){
    var tag = "#"+id;
    console.log("bottone: " + tag + " disabilitato");
    $(tag).data("kendoMobileButton").enable(false);
};
/* abilita un button con id = id */
app.enableButton = function (id){
    var tag = "#"+id;
    console.log("bottone: " + tag + " abilitato");
    $(tag).data("kendoMobileButton").enable(true);
};
/** invia al server la segnalazione */
app.sendRepo = function (){
    app.disableButton("sendButton");
    app.disableButton("takePhoto");
	app.segnalazione.title = $("#titoloToRepo").val();
	app.segnalazione.msg = $("#descrizioneToRepo").val();
	/*console.log(segnalazione.titolo);
	console.log(segnalazione.descrizione);*/
	if (!app.segnalazione.title || !app.segnalazione.msg || app.tmpUri == "" ){
		alert("Completare tutti i campi e scattare una foto prima di inviare la segnalazione!");
		app.enableButton("sendButton");
                app.enableButton("takePhoto");
	}
	else{
		/** avvio l'animazione di caricamento */
		app.startWaiting("Invio Segnalazione ...");
		/* accede al gps per ottenere la posizione */
		navigator.geolocation.getCurrentPosition(
				/* funzione chiamata in caso di posizione ottenuta con successo */
				function (position){
					app.segnalazione.loc.latitude = position.coords.latitude;
					app.segnalazione.loc.longitude = position.coords.longitude;

					console.log("sendRepo(): getCurrentPosition... OK");
					console.log(                 "lat: " + app.segnalazione.loc.latitude + "Nord");
					console.log(                 "lng: " + app.segnalazione.loc.longitude + "Est");

                    // apro il file app.tmpUri (quello scattata dalla fotocamera) in base64 per poterlo inviare al server
                    var reader = new FileReader();
                    reader.onerror = function (error){
                      console.log("sendRepo(): errore reader con codice: " + error.code);
                      alert("Errore applicazione");
                    };
                    // se il file viene aperto correttamente invio la segnalazione al server e la salvo in locale
                    reader.onload = function (evt){
                        app.segnalazione.img.data = evt.target.result.split(",")[1];
                        app.segnalazione.img.content_type = "image/jpeg";
                        console.log("sendRepo(): file aperto...");
                        console.log("    " + app.segnalazione);
                        georep.db.postDoc(app.segnalazione, true, function(err, data){
                            if(!err){
                                console.log("sendRepo(): documento postato sul server");
                                console.log("            data: " + JSON.stringify(data));

                                app.segnalazioneLocale.title = app.segnalazione.title;
                                app.segnalazioneLocale.msg = app.segnalazione.msg;
                                // la segnalazione locale contiene l'immagine in binario e non in base64
                                app.segnalazioneLocale.img = app.tmpUri;
                                app.segnalazioneLocale._id = data.id;
                                app.segnalazioneLocale.date = (new Date()).getTime();
                                app.segnalazioneLocale.loc.latitude = app.segnalazione.loc.latitude;
                                app.segnalazioneLocale.loc.longitude = app.segnalazione.loc.longitude;

                                app.utenteRepoLocale._id = georep.user._id;
                                app.utenteRepoLocale.nick = georep.user.nick;
                                app.utenteRepoLocale.mail = georep.user.mail;
                                localStorage.setItem(app.utenteRepoLocale._id, JSON.stringify(app.utenteRepoLocale));

                                app.coordsToAddress(app.segnalazione.loc.latitude, app.segnalazione.loc.longitude, function(indirizzo){
                                    app.segnalazioneLocale.indirizzo = indirizzo;
                                    localStorage.setItem(app.segnalazioneLocale._id, JSON.stringify(app.segnalazioneLocale));

                                    /* aggiorno la lista locale delle mie segnalazioni e delle ultime segnalazioni
                                     * in modo che se la connessione alla rete internet non è più disponibile dopo che
                                     * la segnalazione è stata consegnata al server, nelle liste questa compaia comunque.
                                     */
                                    var tmpVet = localStorage.getItem(app.MYREPOLIST);
                                    var parsTmpVet;
                                    if (tmpVet == null){
                                        parsTmpVet = [];
                                    }
                                    else{
                                        parsTmpVet = JSON.parse(tmpVet);
                                    }
                                    parsTmpVet.unshift(
                                        {
                                            id: data.id,
                                            key: app.utenteRepoLocale._id,
                                            value: app.segnalazioneLocale.title
                                        }
                                    );
                                    var jsonTmpVet = JSON.stringify(parsTmpVet);
                                    localStorage.setItem(app.MYREPOLIST, jsonTmpVet);

                                    tmpVet = localStorage.getItem(app.LASTREPOLIST);
                                    if (tmpVet == null){
                                        parsTmpVet == [];
                                    }
                                    else {
                                        parsTmpVet = JSON.parse(tmpVet);
                                    }
                                    parsTmpVet.unshift(
                                        {
                                            id: data.id,
                                            key: (new Date()).getTime(),
                                            value: {
                                                _id: data.id,
                                                userId: app.utenteRepoLocale._id,
                                                title: app.segnalazioneLocale.title
                                            }
                                        }
                                    );
                                    jsonTmpVet = JSON.stringify(parsTmpVet);
                                    localStorage.setItem(app.LASTREPOLIST, jsonTmpVet);
                                    alert("Invio segnalazione riuscito!");
                                    app.stopWaiting();
                                    app.clearRepo();
                                    app.enableButton("sendButton");
                                    app.enableButton("takePhoto");
                                    app.navigate(app.mainView);
                                });


                            }else{
                                // fallita la post doc
                                console.log("sendRepo(): postDoc error: ");
                                console.log(JSON.stringify(err));
                                app.enableButton("sendButton");
                                app.enableButton("takePhoto");
                                app.stopWaiting();
                                alert("Invio segnalazione fallito!...Prova di nuovo");
                            }
                        });
                    }
                    window.resolveLocalFileSystemURI(app.tmpUri, function (fileEntry){
                        fileEntry.file(function (file){
                            reader.readAsDataURL(file);
                        }, function (error){
                           console.log("sendRepo(): fileEntry.file errore: " + JSON.stringify(error));
                            app.stopWaiting();
                            app.enableButton("sendButton");
                            app.enableButton("takePhoto");
                            alert("Impossibile inviare la segnalazione. Riprova");
                        });
                    }, function (error){
                        // non è stato possibile aprire il file app.tmpUri
                        console.log("sendRepo(): resolveLocalFileSystemURI errore: " + JSON.stringify(error));
                        app.stopWaiting();
                        app.enableButton("sendButton");
                        app.enableButton("takePhoto");
                        alert("Invio segnalazione fallito!...Prova di nuovo");
                    });

				},
				/* funzione chiamata se non si riesce ad ottenere la posizione */
                function (error){
					console.log("sendRepo(): getCurrentPosition... ERROR");
					console.log("                code:    " + error.code);
					console.log("                message: " + error.code);
					/** appena la chiamata ritorna termino l'animazione */
					app.stopWaiting();
                    app.enableButton("sendButton");
                    app.enableButton("takePhoto");
					if (error.code == PositionError.TIMEOUT) console.log("timeout scaduto");
					alert("Impossibile ottenere la posizione. Controllare le impostazioni per il gps");
				}, {enableHighAccuracy: false, timeout: 5000, maximumAge: 15000}); //opzione che permette di ottenere la posizione sfruttando il gps del dispositivo

	}
};

app.clearRepo = function(){
	console.log("clearRepo()");
	app.segnalazione.title = "";
	app.segnalazione.msg = "";
	app.segnalazione.img.data = "";
    app.segnalazione.img.content_type = "";
	app.segnalazione.loc.latitude = "";
	app.segnalazione.loc.longitude = "";

    app.tmpUri = "";

	$("#titoloToRepo")[0].value = '';
	$("#descrizioneToRepo")[0].value = '';
	$('#imgToRepo')[0].src = 'img/placeholder.png';
},
	

// ------------------ sezione AVVIO & OPZIONI ----------------------------------

/**
 * Stringhe di default 'improbabili' rispettivamente per:
 *  - indirizzo email dell'utente
 *  - nick name dell'utente
 *
 * questi valori saranno relativi ad un utente nuovo o parzialmente registrato
 * sul server
 */
app.FAKE_MAIL = '-:RkFLRV9NQUlM:-';
app.FAKE_NICK = '-:RkFLRV9OSUNL:-';

/**
 * Costante che rappresenta la chiave usata nel localStorage per salvare localmente la lista delle segnalazioni fatte dall'utente stesso dell'app
 */
app.MYREPOLIST = "myRepo";
/**
 * Costante che rappresenta la chiave usata nel localStorage per salvare localmente la lista delle ultime segnalazioni effettuate
 * con l'applicazione (anche da altri utenti)
 */
app.LASTREPOLIST = "lastRepo";

/**
 * ID della view da mostrare all'avvio
 */
app.mainView = '#last-view';

/**
 * Configura il sistema per poter essere in grado di accedere al server remoto.
 * Per il nome dell'utente e la password si usa lo stesso valore che e' ottenuto
 * dall'identificatore universale del dispositivo.
 */
app.configServer = function(){
	//console.log(window.device);
	georep.user.set({
		name: device.uuid,
       	password: device.uuid,
       	nick: localStorage.userNick,
       	mail: localStorage.userMail
    });
	georep.db.setDBName('testdb');
	georep.db.setURLServer({
		proto: 'http://',
		host: 'pram.no-ip.org',
		port: 5984
	});
};

/**
 * Eseguita a tempo di inizializzazione della view del edit delle info dell'utente.
 *
 * Configura il gestore dell'evento 'click' del bottone della view delle info.
 * Il gestore recupera le info locali e quelle immesse dall'utente e le confronta:
 * se ci sono differenze allora scatena l'aggiornamento di tali informazioni,
 * altrimenti non considera i valori immessi e torna alla mappa.
 */
app.initOptionView = function(){
	$('#input-ok').on('click', function(){
		if (localStorage.userNick == app.FAKE_NICK || localStorage.userMail == app.FAKE_MAIL){
		// allora siamo al primo avvio e bisogna fare una signup e gestire
		// tutti gli errori del caso.
		// Da tenere a mente che siamo fermi nella view delle opzioni e la mappa
		// non è ancora stata inizializzata.
			var newNick = $('#input-nick')[0].value;
			var newMail = $('#input-mail')[0].value;
			app.signUpNewUser(newNick, newMail);
		}else{
		// i dati locali sono consistenti e quindi al click bisongna semmai fare
		// una update.
		// Da tenere a mente che in questo caso è l'utente che ha navigato in
		// questa view delle opzioni e quindi la mappa è già inizializzata
			var currentNick = localStorage.userNick;
			var currentMail = localStorage.userMail;
			var newNick = $('#input-nick')[0].value;
			var newMail = $('#input-mail')[0].value;
			if(newNick != currentNick || newMail != currentMail) {
			// i dati sono stati modificati e quindi vanno aggiornati in locale
			// sul server.
				app.saveOptions(newNick, newMail);
			} else {
			// nessuna modifica, si torno alla mappa.
				app.navigate(app.mainView);	
			}
		}
	});
};

/**
 * Funzione eseguita ogni volta che viene mostrata la view delle opzioni.
 * 
 * Vengono caricati i valori locali delle inputbox della view; se i valori
 * locali sono 'fake' vengono caricate stringhe vuote cosi che l'utente e'
 * obbligato ad inserire valori consistenti per andare avanti (vedere lo handler
 * del click sul bottone della view delle opzioni).
 */
app.showOptionView = function(){
	var currentNick = (localStorage.userNick == app.FAKE_NICK)?'':localStorage.userNick;
	var currentMail = (localStorage.userMail == app.FAKE_MAIL)?'':localStorage.userMail;

	//console.log("currentNick: " + currentNick);

	$('#input-nick').attr('value',currentNick);
	if ( currentNick && currentNick != '' ){
		$('#input-nick').attr('disabled','disabled');
	}
	$('#input-mail').attr('value',currentMail);
};

/**
 * Controlla se la app e' al primo avvio o se l'utente non e' stato configurato
 * completamente l'ultima volta (si e' riusciti ad aggiungere l'utente sul server
 * ma per qualche motivo e' fallito l'aggiornamento delle sui informazioni).
 *
 * In ogni caso inizializza un utente con info fittizie e controlla se tale
 * utente esiste sul server, se esiste scarica le sue info e se scopre che sono
 * 'fasulle' (quelle di default) rimane nella view opzioni altrimenti aggiorna
 * la configurazione locale a passa alla view della mappa.
 * Se l'utente non esiste lo crea e rimena nella view delle opzioni.
 */
app.loader = function() {
	if(!localStorage.userNick || !localStorage.userMail){
	// primo avvio o dati locali assenti
		 /** creo delle opzioni 'fake' */
		localStorage.userNick = app.FAKE_NICK;
		localStorage.userMail = app.FAKE_MAIL;
		app.configServer();
		
		//app.startWaiting();
		georep.user.check(function(err, data){
			if(!err){
				if(data.isRegistered){
				// utente registrato
					georep.user.getRemote(function(err,data){
						if(!err){
							localStorage.userNick = data.nick;
							localStorage.userMail = data.mail;
							app.configServer();

							//app.initMap();
							//app.stopWaiting();
                            //navigator.splashscreen.hide();
							app.navigate(app.mainView);

						}else{
						// errore comunicazione della getRemote
                            //app.splashscreen.hide();
							//app.stopWaiting();
							localStorage.clear();
							alert("Errore Server. Prova più tardi");
						}
					});
				}else{
                    //navigator.splashscreen.hide();
					//app.stopWaiting();
				// utente non registrato
					// si rimane fermi qui nella view delle opzioni e la funzione
					// di click del bottone 'fatto' penserà a registrare l'utente.
					// semmai qui bisogna settare l'handler giusto per quel bottone
					// perchè deve fare una signup
				}
			}else{
                //app.splashscreen.hide();
				//app.stopWaiting();
				localStorage.clear();
				alert("Errore Server. Prova più tardi");
			}
		});
		
	}else{
	// non il primo avvio con dati locali consistenti
		app.configServer();

		//app.initMap();
        //navigator.splashscreen.hide();
		app.navigate(app.mainView);

	}
};

/**
 * Si occupa di aggiornare le info locali e remote dell'utente
 * con i valori passatole come parametri
 */ 
app.saveOptions = function(nick, mail){
	if (!nick || !mail)
		alert('Inserire NickName e E-Mail');
	else {
		/**
		 * Aggiorna le info dell'utente sia sul server che locali (configurazioni
		 * di georep).
		 */
		app.startWaiting();
		georep.user.update({
			name: georep.user.name,
			password: georep.user.password,
			nick: nick,
			mail: mail
		},function(err, data){
			if(!err){
				/**
				 * Se l'utente e' stato aggiornato memorizzo localmente in modo
				 * 'permanente' le nuove informazioni.
				 */
				localStorage.userNick = nick;
				localStorage.userMail = mail;
				
				console.log("salvato in locale 'nick': " + localStorage.userNick);
				console.log("salvato in locale 'mail': " + localStorage.userMail);
				
				/** riaggiorno la config del sistema con le nuove info */
				app.configServer();
				
				/**
				 * Questo controllo ha senso perche' questa funzione puo' venir chiamata
				 * anche piu' volte nella app e quindi evito di fare del casino inizializzando
				 * piu' volte la mappa
				 */
				app.stopWaiting();
				//if(!app.map)
				//	app.initMap();
				app.navigate(app.mainView);
			}else{
				app.stopWaiting();
				alert("Errore Server. Prova più tardi");
			}
		});
	}
};

/**
 * Registra un nuovo utente sul server inviando la richiesta al server nodeJS.
 * Viene chiamata al click sul bottone di conferma nella finestra delle opzioni
 * al primo avvio e quindi la mappa non è ancora inizializzata.
 * Per gestire il caso in cui il nick è duplicato è sufficiente lanciare una alert
 * e lasciare localStorage.userNick = app.FAKE_NICK e localStorage.userMail = app.FAKE_MAIL
 * così che un successivo click esegua sempre questa funzione.
 */ 
app.signUpNewUser = function(nick, mail){
	if (!nick || !mail)
		alert('Inserire NickName e E-Mail');
	else {
		
		/* aggiorno l'utente locale */
		localStorage.userNick = nick;
		localStorage.userMail = mail;
		app.configServer();
		
		app.startWaiting();
		georep.user.signup(function(err, data){
			if(!err){
				app.stopWaiting();
				//if(!app.map)
				//	app.initMap();
				app.navigate(app.mainView);
			} else {
				/* se il messaggio di errore contiene il campo nickDuplicate esiste un utente con lo stesso nick
				 * quindi è necessario che l'utente ne scelga uno diverso
				 */
				if (JSON.parse(err.jqXHR.responseText).nickDuplicate){
					/* vanno settati a fake in modo che premere il tasto "fatto" comporti la riesecuzione della signup
					 * e non della update
					 */
					localStorage.userNick = app.FAKE_NICK;
					localStorage.userMail = app.FAKE_MAIL;
					app.configServer();
					app.stopWaiting();
					alert("Questo nick non è disponibile.");
				} else{
					localStorage.clear();
					app.stopWaiting();
					alert("Errore Server. Prova più tardi.");
				}
			}
		});
	}
};

/**
 * Funzione che deve essere eseguita per prima quando l'intera pagina e stata
 * completamente caricata.
 */
app.initialize = function() {
    this.bindEvents();
    app.createLastListView();
	app.createViewList();
};

/**
 * Registra i listeners degli eventi necessari in fase di avvio.
 * In questo caso solo quello da eseguire quando le api di Cordova sono
 * disponibili
 */
app.bindEvents = function() {
    document.addEventListener('deviceready', app.onDeviceReady, false);
};

/**
 * Gestore dell'evento 'deviceready' eseguito quando le api cordova sono pronte.
 * In questo caso scatena il controllo dell'utente ed eventuale registrazione.
 */
app.onDeviceReady = function() {
    /* disabilita il funzionamento del tasto back su android, dato che è inutile in questo tipo di app */
    document.addEventListener("backbutton", app.back, false);
    //app.localRepo = new PouchDB("localRepo");
    //app.localUsers = new PouchDB("localUsers");
	app.loader();
};

app.back = function () {
    console.log("premuto il tasto back");
};
//----------------------- Animazione di Caricamento ----------------------------

/**
 * Avvia l'animazione di caricamento con un messaggio personalizzato
 *
 * msg (string): messaggio mostrato con l'animazione. Se omesso viene mostrato
 *               il messaggio di default di kendo ui.
 */
app.startWaiting = function(msg) {
	if(msg) app.changeLoadingMessage(msg);
	app.showLoading();
};

/**
 * Elimina l'animazione di caricamento
 */
app.stopWaiting = function(){
	app.hideLoading();
};

//-------------------- View Delle Ultime Segnalazioni --------------------------

/**
 * Realizza il padding di un numero.
 *
 * n (number): numero
 * width (number): numero di cifre
 * padder (...): simbolo da usare per il padding
 */
app.numberPadding = function(n, width, padder){
	padder = padder || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(padder) + n;
};

/**
 * Data una data espressa in millisecondi da EPOC, ritorna una stringa
 * nel formato GG/MM/AAAA - hh:mm:ss
 *
 * milsToEPOC (number): millisecondi trascordi da EPOC
 */
app.dateToString = function(milsToEPOC){
	var d = new Date(milsToEPOC);
	return app.numberPadding( d.getDate(),      2) + '/'   +
	       app.numberPadding( d.getMonth() + 1, 2) + '/'   +
	       app.numberPadding( d.getFullYear(),  4) + ' - ' +
	       app.numberPadding( d.getHours(),     2) + ':'   +
	       app.numberPadding( d.getMinutes(),   2) + ':'   +
	       app.numberPadding( d.getSeconds(),   2)         ;
};

/* dataSource per la lastView */
app.lastRepDataSource = new kendo.data.DataSource({ });

/* crea la listView per contenere le ultime segnalazioni inviate sul server */
app.createLastListView = function (){
	$("#lastViewContent").kendoMobileListView({
		dataSource: app.lastRepDataSource,
		click: function(e) {
			// Ogni elemento della lista è un oggetto del tipo:
			// {
			//     id: ...,
			//     key: <data in milsToEpoc>,
			//     value: {
			//         userId: ...,
			//         title: ...
			//     }
			// }
			
			// passo id e userId ad app.query per permettere alla view dei dettagli
			// di recuperare il documento completo dal server
			app.query.docId = e.dataItem.id;
			app.query.userId = e.dataItem.value.userId;
		    // apro la view dei dettagli
		    app.navigate("#view-repoDetail");
		},
		// in questo modo ogni elemento della lista avra' questo aspetto:
		// -------------------------------
		//   Titolo Della Segnalazione
		//   GG/MM/AAAA - hh:mm:ss
		// -------------------------------
		template: "<h5>#:value.title#</h5><p>#:app.dateToString(key)#</p>"
	}); 
};

/* Carica la lista delle ultime segnalazioni da locale */
app.getLastDataFromLocal = function (){
    if(localStorage.getItem(app.LASTREPOLIST) != null){
        app.lastRepDataSource.data(JSON.parse(localStorage.getItem(app.LASTREPOLIST)));
    }
    else{
        app.lastRepDataSource.data([]);
    }
    console.log(app.lastRepDataSource);
}
/* Prende le utlime segnalazioni inviate al server e le passa alla listView */
app.getLastDataFromServer = function(){
    app.startWaiting();

    /* questo if server per testare l'app sul browser, in quanto non esiste connection.type come su phonegap */
    /*if (app.nonConnesso == true){
        console.log("non c'è connessione");
         if(localStorage.getItem(app.LASTREPOLIST) != null)
         app.lastRepDataSource.data(JSON.parse(localStorage.getItem(app.LASTREPOLIST)));
         else
         app.lastRepDataSource.data([]);
    }*/
    /* se non c'è connessione uso la lista locale delle ultime segnalazioni */
    if (app.checkConnection() == false){
        console.log("non c'è connessione. Dati caricati da locale");
        app.getLastDataFromLocal();
        app.stopWaiting();
    }
    /* se c'è connessione scarico la lista delle ultime segnalazioni dal server */
    else{
        georep.db.getLastDocs(10, function(err, data){
            if (err != undefined){
                app.getLastDataFromLocal();
                console.log("impossibile caricare le ultime segnalazioni dal server. caricata la lista locale");
                app.stopWaiting();
            }
            else{
                // inserisce i dati contenuti in data.rows nella listView.
                // data.rows è il vettore restituito dalla getLastDocs in caso di successo.
                // Ogni elemento del vettore è del tipo {id: ..., key: ..., value: ...}
                app.lastRepDataSource.data(data.rows);
                localStorage.setItem(app.LASTREPOLIST, JSON.stringify(data.rows));
                app.stopWaiting();
            }
        });
    }

};

//-------------------- per la simulazione nel browser --------------------------	
//window.device = {uuid: "MiBe"};

//funzione da chiamare nella console del browser per inizializzare l'app
app.initBrowser = function (uuid){
    window.device = {};
    window.device.uuid = uuid;
    navigator.connection = {};
    Connection = {};
    Connection.ETHERNET = 1;
    Connection.NONE = 0;
    navigator.connection.type = Connection.ETHERNET;
    app.onDeviceReady();
};
