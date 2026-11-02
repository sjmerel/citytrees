#!/bin/bash


function usage()
{
    echo ""
    echo "generates config file for deployment type"
    echo ""
    echo "usage:"
    echo "  $0 <config>"
    echo ""
    echo "config is {local, prod}"
}

if [ $# -ne 1 ]
then
    usage
    exit 1
fi

cd `dirname $0`

deployment=$1

case $deployment in
    local)
        localhost=`scutil --get LocalHostName`.local
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
echo $localhost


cat << EOF > ./ios/trees/deployment.json
{
   "serverUrlBase": "$serverUrlBase",
   "deployment": "$deployment",
}
EOF


