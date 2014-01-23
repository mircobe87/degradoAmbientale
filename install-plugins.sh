#!/bin/bash

plugins="org.apache.cordova.device\
         org.apache.cordova.network-information\
         org.apache.cordova.geolocation\
         org.apache.cordova.camera\
         org.apache.cordova.file\
         org.apache.cordova.file-transfer\
         org.apache.cordova.splashscreen\
         org.apache.cordova.console"

if [ ! -d plugins ]; then
    echo -e "Creo directory \"plugins\"..."
    mkdir plugins
fi

for url in $plugins; do
    phonegap local plugin add $url
done

exit 0
