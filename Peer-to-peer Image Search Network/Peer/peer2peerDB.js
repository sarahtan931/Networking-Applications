let net = require('net'),
    singleton = require('./Singleton'),
    handler = require('./ClientHandler');
imagehandler = require('./ImageHandler');

const ITPresponse = require('./ITPResponse');
const PTPpacket = require('./cPTPRequest');

const yargs = require('yargs/yargs');
let fs = require('fs');
const { hideBin } = require('yargs/helpers');
const argv = yargs(hideBin(process.argv)).argv;
net.bytesWritten = 300000;
net.bufferSize = 300000;

singleton.init();

// get current folder name
let path = __dirname.split("\\");
let senderid = path[path.length - 1].split("-")[0];
let fullLength = path[path.length - 1].split("-")[1];

//creating peer server and peer client
let imageServer = net.createServer();
let peerServer = net.createServer();
let peer = new net.Socket();

//declaring variables
let portConnect = 0;
let newPortConnect = 0;
let newHostConnect = '';
let portLocal = 0;

let peered = "";
let peeringdeclined = [];
let queue = []; //queue to hold all peers

//function to redirect peer
function redirect(newPortConnect, newHostConnect) {
    peer.connect({ port: newPortConnect, host: newHostConnect }, function () { });
}

//if user inputs -p flag
if (argv.p) {
    let connectData = argv.p.split(':');
    let host = connectData[0];
    portConnect = connectData[1];

    //initializing image socket
    imageServer.listen(0);
    let imgportServer = imageServer.address().port;

    //initializing peer socket
    peerServer.listen(0);
    let portServer = peerServer.address().port;
    portLocal = portServer;

    //creating an image Server
    imageServer.on('connection', function (sock) {
        singleton.setSenderInfo(senderid, imgportServer, host);
        singleton.setImagePort(imgportServer);
        imagehandler.handleImageRequest(sock)
    });
    console.log('ImageDB server is started at timestamp: ', singleton.getTimestamp(), 'and is listening on: ', host, ':', imgportServer);

    //creating a peer server
    peerServer.on('connection', function (sock) {
        handler.handleClientJoining(sock, fullLength, senderid, portServer);
        if (msgtype == 1) {
            console.log('\n')
            console.log('Connected from peer 127.0.0.1', " : ", (sock.remotePort - 1));
        }
    });

    //creating a peer client 
    peer.connect({ port: portConnect, host: host }, function () {
    });

    //receiving message from peer and reading it
    peer.on('data', function (data) {
        timestamp = singleton.getTimestamp();

        let binarystring = "";
        datasize = Buffer.byteLength(data);
        readBuffer = Uint8Array.from(data);

        //reading the data into a binary string
        for (let i = 0; i < datasize; i++) {
            let read = readBuffer[i];
            binarystringtemp = read.toString(2).padStart(8, "0");
            binarystring = binarystring + binarystringtemp;
        }

        msgtype = parseInt(binarystring.substring(3, 11), 2);

        //parsing if it is an ptp message
        if (msgtype == 1 || msgtype == 2) {
            readData(binarystring, timestamp, host, portConnect, senderid, peer)
        }
        //parsing if it is a PTP packet
        if (msgtype == 3) {
            readPTP(binarystring, data)
        }
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
        newConnect = queue.shift();
       
        //if there is a port to connect to redirect the peer
        if (newConnect) {
            newPortConnect = newConnect.PORT;
            newHostConnect = newConnect.HOST;
            peeringdeclined.push(newPortConnect);
            redirect(newPortConnect, newHostConnect)
        }
    })

} else { //if the user inputs without a -p flag
    let HOST = '127.0.0.1';

    //initializing image socket
    imageServer.listen(0);
    let imgportServer = imageServer.address().port;

    //initializing peer socket
    peerServer.listen(0);
    let portServer = peerServer.address().port;

    //image server
    imageServer.on('connection', function (sock) {
        imagehandler.handleImageRequest(sock)
        singleton.setImagePort(imgportServer);
    });
    console.log('ImageDB server is started at timestamp: ', singleton.getTimestamp(), 'and is listening on: ', HOST, ':', imgportServer);

    console.log('This peer address is ', HOST, ":", portServer, 'located at', senderid)

    //peer server
    peerServer.on('connection', function (sock) {
        let msgtype = handler.handleClientJoining(sock, fullLength, senderid, portServer);
        if (msgtype == 1) { //if the peer is accepted
            console.log('\n')
            console.log('Connected from peer ', HOST, " : ", (sock.remotePort - 1));
        }
    });
}

function readPTP(binarystring, data) {
    let arrtype = [];
    let arrname = [];
    let imagesFound = [];
    let imagesNotFound = [];
    let arrnamefound = [];
    let arrtypefound = [];

    //parsing the header information
    v = parseInt(binarystring.substring(0, 3), 2);
    ic = parseInt(binarystring.substring(11, 16), 2);
    searchid = parseInt(binarystring.substring(16, 24), 2);
    senderidlength = parseInt(binarystring.substring(24, 32), 2);
    let index = 32 + (senderidlength * 8);
    let peeradd1 = parseInt(binarystring.substring(index, index + 8), 2);
    let peeradd2 = parseInt(binarystring.substring(index + 8, index + 16), 2);
    let peeradd3 = parseInt(binarystring.substring(index + 16, index + 24), 2);
    let peeradd4 = parseInt(binarystring.substring(index + 24, index + 32), 2);
    let peeraddressstring = peeradd1.toString() + "." + peeradd2.toString() + "." + peeradd3.toString() + "." + peeradd4.toString();
    let imageport = parseInt(binarystring.substring(index + 32, index + 48), 2);


    //checking to see if the packet has been seen before or coming from the same port
    let searchHistory = singleton.getRecentSearches();
    if (searchHistory.includes(searchid) || imageport == singleton.getImagePort()) {
        console.log('Dropping packet')
    } else {
        console.log('Received cPTP search packet')
        singleton.setRecentSearches(searchid) //setting recent searches 

        //declaring variables
        let finaltypestring = "";
        let finalnamestring = "";
        let newstart = 32 + (senderidlength * 8) + 32 + 16;

        //looping through the payload of each image
        for (i = 0; i < ic; i++) {
            let imgname = "";
            let typeend = newstart + 4;

            //parsing through the data and converting it to string
            type = parseInt(binarystring.substring(newstart, typeend), 2);

            if (type == 1) { typestring = "BMP" }
            else if (type == 2) { typestring = "JPEG" }
            else if (type == 3) { typestring = "GIF" }
            else if (type == 4) { typestring = "PNG" }
            else if (type == 4) { typestring = "TIFF" }
            else { typestring = "RAW" }

            //adding the image type to an array
            finaltypestring = finaltypestring + ' ' + typestring;
            arrtype.push(typestring)

            //parsing through the image name 
            nameend = typeend + 12;
            namelength = parseInt(binarystring.substring(typeend, nameend), 2);

            //looping through the image name bytes and converting to ascii
            for (j = nameend; j < (nameend + namelength * 8); j = j + 8) {
                let charb = binarystring.substring(j, j + 8)
                imgname = imgname + String.fromCharCode(parseInt(charb, 2));
            }

            //adding the image names to an array
            finalnamestring = finalnamestring + imgname + ' ';
            arrname.push(imgname)
            newstart = nameend + namelength * 8;

            //searching database for the image
            let path = './images/' + imgname + "." + typestring;
            if (fs.existsSync(path)) {
                let imagesFoundString = imgname + '.' + typestring;
                imagesFound.push(imagesFoundString);
                arrnamefound.push(imgname);
                arrtypefound.push(typestring);

            } else {
                let imagesNotFoundString = imgname + '.' + typestring;
                imagesNotFound.push(imagesNotFoundString);
            }
        }

        //if there are images found sending an itp response
        if (imagesFound.length > 0) {
            if (imagesFound.length == arrtype.length) { f = 1 } //if response fully fulfilled
            else { f = 0 } //if response not fully fulfilled
            ITPresponse.init(7, f, 1, singleton.getTimestamp(), singleton.getSequenceNumber(), arrnamefound, arrtypefound);
            newITPresponse = ITPresponse.getPacket();
            let findImages = new net.Socket();

            findImages.connect({ port: imageport, host: peeraddressstring }, function () { });
            findImages.write(newITPresponse);
            findImages.end();

            //if some images are not found sending an search packet for the images not found
            if (imagesNotFound.length > 0) {
                let searchId = Math.floor((Math.random() * 99) + 1);
                senderid = singleton.getSenderId()
                PTPpacket.init(v, imagesNotFound.length, searchId, senderid, peeraddressstring, imageport, imagesNotFound);
                let searchpacket = PTPpacket.getBytePacket();
                peersearch(searchpacket)
            }
        } else {
            //if no images are found peer search
            peersearch(data)
        }
    }
}

//function to send packet to peers
function peersearch(searchpacket) {
    let peers = singleton.getPeerTable();
    for (let i = 0; i < peers.length; i++) {
        peers[i].SOCK.write(searchpacket);
    }
}

//function to read the data sent back from the peer
function readData(binarystring, timestamp, host, portConnect, senderid, socket) {
    let senderidstring = "";

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
        let peeradd1 = parseInt(binarystring.substring(newstart, newstart + 8), 2);
        let peeradd2 = parseInt(binarystring.substring(newstart + 8, newstart + 16), 2);
        let peeradd3 = parseInt(binarystring.substring(newstart + 16, newstart + 24), 2);
        let peeradd4 = parseInt(binarystring.substring(newstart + 24, newstart + 32), 2);
        peeraddressstring = peeradd1.toString() + "." + peeradd2.toString() + "." + peeradd3.toString() + "." + peeradd4.toString();


        //adding to stack
        if (!peeringdeclined.includes(newPortConnect)) {
            queue.push({"HOST":peeraddressstring,"PORT":peerportnum});
        }

        peered = peered + "[" + peeraddressstring + ":" + peerportnum + ']  ';
        newstart = newstart + 48;
    }

    if (v != 7) { //ignore if v does not equal 7
        return 0;
    }

    else if (msgtype == 2) {  //if the packet is redirect
        console.log('\nReceived ack from ', senderidstring, ':', portConnect);
        if (peered.length > 0) { //if peered with others print peer table
            console.log('\tWhich is peered with', peered)
        }
        console.log('\n')
        console.log('The join has been declined; The auto join process is being performed... ');

        // destroying the peer
        peered = "";
        peer.destroy();
    }

    //if the packet is welcome
    else {
        //add peer to peer table
        if (newPortConnect > 0) {
            //add the host and port to the peer table
            singleton.addPeerTable(host, newPortConnect, socket)
            //print connection information
            console.log('\n')
            console.log('Connected to peer ', senderidstring, ':', newPortConnect, 'at timestamp: ', timestamp);
            console.log('This peer address is', host, ':', portLocal, 'located at', senderid);
            console.log('Received ack from ', senderidstring, ':', newPortConnect);
            if (peered.length > 0) { //if peered with others print peer table
                console.log('\tWhich is peered with', peered)
            }
        } else {
            //add the host and port to the peer table
            singleton.addPeerTable(host, portConnect, socket)
            console.log('\n')
            //print connection information
            console.log('Connected to peer ', senderidstring, ':', portConnect, 'at timestamp: ', timestamp);
            console.log('This peer address is', host, ':', portLocal, 'located at', senderid);
            console.log('Received ack from ', senderidstring, ':', portConnect);
            if (peered.length > 0) { //if peered with others print peer table
                console.log('\t Which is peered with', peered)
            }
        }
    }
}