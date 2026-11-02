#!/bin/bash


function usage()
{
    echo ""
    echo "generates config file for deployment type"
    echo ""
    echo "usage:"
    echo "  $0 <config> <os>"
    echo ""
    echo "config is {local, prod}"
    echo "os is {ios, android}"
}

if [ $# -ne 2 ]
then
    usage
    exit 1
fi

cd `dirname $0`

deployment=$1
os=$2

case $deployment in
    local)
        # see https://stackoverflow.com/questions/13322485/how-to-get-the-primary-ip-address-of-the-local-machine-on-linux-and-os-x
        # filter out 127.0.0.1 (localhost) and 169.254.* (automatic private addresses)
        localhost=`ifconfig | grep -Eo 'inet \d*\.\d*\.\d*\.\d*' | grep -Eo '\d*\.\d*\.\d*\.\d*' | grep -Ev '^(127.0.0.1|169.254|10.255)' | head -1`
        serverUrlBase=http://$localhost:8000 
        ;;

    prod)
        serverUrlBase="https://storage.googleapis.com/trees-tiles/v1/"
        ;;

    *)
        usage
        exit 1
        ;;
esac


json=$(cat << EOF
{
   "serverUrlBase": "$serverUrlBase",
   "deployment": "$deployment"
}
EOF
)



case $os in
    ios)
        echo "$json" > ./ios/trees/deployment.json
        ;;
    android)
        mkdir -p ./android/app/src/main/resources
        echo "$json" > ./android/app/src/main/resources/deployment.json
        ;;
    *)
        usage
        exit 1
        ;;
esac

