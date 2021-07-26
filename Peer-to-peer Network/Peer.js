let net = require('net'),
    singleton = require('./Singleton'),
    handler = require('./ClientHandler');

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const argv = yargs(hideBin(process.argv)).argv;
var path = require('path');

net.bytesWritten = 300000;
net.bufferSize = 300000;

singleton.init();

//getting bandwidth and peer name from the console
let pathname = require('path').dirname(require.main.filename)
let folder = pathname.slice(pathname.length - 7);
let inputdata = folder.split('-');
let senderid = inputdata[0];
let fullLength = inputdata[1];

//creating peer server and peer client
let peerServer = net.createServer();
let peer = new net.Socket();

//declaring variables
let newhost = "127.0.0.1";
let portConnect = 0;
let newPortConnect = 0;
let portLocal = 0;

let returnedpeers = 0;
let returned = false;
let returnedpeertable = [];

//function to redirect peer
function redirect(host) {
    peer.connect({ port: newPortConnect, host: host }, function () {});
}

//if user inputs -p flag
if (argv.p) {
    let connectData = argv.p.split(':');
    let host = connectData[0];
    portConnect = connectData[1];

    peerServer.listen(0);
    let portServer = peerServer.address().port;
    portLocal = portServer;
   
    //creating a peer server
    peerServer.on('connection', function (sock) {
        handler.handleClientJoining(sock, fullLength, senderid);
        console.log('Connected from peer ', host, " : ", (sock.remotePort - 1));
    });

    //creating a peer client 
    peer.connect({ port: portConnect, host: host }, function () {
    });

    //receiving message from peer and reading it
    peer.on('data', function (data) {
        timestamp = singleton.getTimestamp();
        readData(data, timestamp, host, portConnect, senderid)
    });

    //if peer disconnects
    peer.on('disconnect', function (data) {
        console.log('disconnecting')
    });

    //catching errors
    peer.on('error', function (error) {
    })

    //closing socket
    peer.on('close', function (error) {
        //if there are peers to connect to redirect before closing
        if (returnedpeers <= returnedpeertable.length){
            redirect(newhost)
            returnedpeers = returnedpeers + 1;
         }
    })
} else {
    let HOST = '127.0.0.1';

    //starting a server
    peerServer.listen(0);
    let portServer = peerServer.address().port;

    console.log('This peer address is ', HOST, ":", portServer, 'located at', senderid)

    //handling peers joining the server
    peerServer.on('connection', function (sock) {
        let msgtype = handler.handleClientJoining(sock, fullLength, senderid);
        if (msgtype == 1){
            console.log('\n')
            console.log('Connected from peer ', HOST, " : ", (sock.remotePort - 1));
        }
    });
}

//this is the function to read the data sent back from the peer
function readData(data, timestamp, host, portConnect, senderid) {
    let peered = [];
    let binarystring = "";
    let senderidstring = "";
    datasize = Buffer.byteLength(data);
    readBuffer = Uint8Array.from(data);

    //reading the data into a binary string
    for (let i = 0; i < datasize; i++) {
        let read = readBuffer[i];
        binarystringtemp = read.toString(2).padStart(8, "0");
        binarystring = binarystring + binarystringtemp;
    }

    //parsing the header 
    v = parseInt(binarystring.substring(0, 3), 2);
    msgtype = parseInt(binarystring.substring(3, 11), 2);
    numpeers = parseInt(binarystring.substring(11, 24), 2);
    senderidlength = parseInt(binarystring.substring(24, 32), 2);

    //looping through data to decode the sender id
    for (j = 32; j < 32 + (senderidlength * 8); j = j + 8) {
        let charb = binarystring.substring(j, j + 8)
        senderidstring = senderidstring + String.fromCharCode(parseInt(charb, 2));
    }

    //getting the payload information
    let newstart = 32 + (senderidlength * 8);
    for (i = 0; i < numpeers; i++) {
        let peeraddressstring = "";
        peeraddress = parseInt(binarystring.substring(newstart, newstart + 32), 2);
        peerportnum = parseInt(binarystring.substring(newstart + 32, newstart + 48), 2);
        peeraddressstring = [peeraddress >> 24 & 0xff, peeraddress >> 16 & 0xff, peeraddress >> 8 & 0xff, peeraddress & 0xff].join('.');

        //creating array for the peer table
        if (!returned){
            returnedpeertable.push(peerportnum);
        }
        peered.push(peerportnum)
        newstart = newstart + 48;
    }

    returned = true;
    //ignore if v does not equal 7
    if (v != 7) {
        return 0;
    }

    //if the packet is redirect
    else if (msgtype == 2) {
        console.log('Received ack from ', senderidstring, ':', portConnect);
        console.log(printPeers(0, peered))
        console.log('\n')
        console.log('The join has been declined; The auto join process is being performed... ');
        
        //declaring the new port to connect to then destroying the peer
        newPortConnect = returnedpeertable[returnedpeers];
        peer.destroy();
    }

    //if the packet is welcome
    else {
        //add peer to peer table
        if (newPortConnect > 0){
            //add the host and port to the peer table
            singleton.addPeerTable(host, newPortConnect)
            //print connection information
            console.log('\n')
            console.log('Connected to peer ', senderidstring, ':', newPortConnect, 'at timestamp: ', timestamp);
            console.log('This peer address is', host, ':', portLocal, 'located at', senderid);
            console.log('Received ack from ', senderidstring, ':', newPortConnect);
            console.log(printPeers(1, peered))
        }else{
            //add the host and port to the peer table
            singleton.addPeerTable(host, portConnect)
            console.log('\n')
            //print connection information
            console.log('Connected to peer ', senderidstring, ':', portConnect, 'at timestamp: ', timestamp);
            console.log('This peer address is', host, ':', portLocal, 'located at', senderid);
            console.log('Received ack from ', senderidstring, ':', portConnect);
            console.log(printPeers(1, peered))
        }
    }
}

//if there are peers print them
function printPeers(indexstart, peered){
    if (peered.length > indexstart){
        printstring = "\t Which is peered with:"
        for (indexstart; indexstart < peered.length; indexstart++){
            printstring = printstring +  ' [127.0.0.1: ' + peered[indexstart] + '] ';
        }
    }
    else{
        printstring = "";
    }
    return printstring;
}