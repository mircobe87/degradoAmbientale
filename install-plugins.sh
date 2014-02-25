#!/bin/bash

plugins="org.apache.cordova.device@0.2.7\
         org.apache.cordova.network-information@0.2.6\
         org.apache.cordova.geolocation@0.3.5\
         org.apache.cordova.camera@0.2.6\
         org.apache.cordova.file@0.2.5\
         org.apache.cordova.file-transfer@0.4.0\
         org.apache.cordova.splashscreen@0.2.6\
         org.apache.cordova.console@0.2.6"

if [ ! -d plugins ]; then
    echo -e "Creo directory \"plugins\"..."
    mkdir plugins
fi

for url in $plugins; do
    phonegap local plugin add $url
done

exit 0
