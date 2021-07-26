const PTPMessage = require('./PTPMessage');
let singleton = require('./Singleton');
let fs = require('fs');
const ITPresponse = require('./ITPResponse');
const PTPpacket = require('./cPTPRequest');


module.exports = {

    handleClientJoining: function (sock, fullLength, senderid, portLocal) {

        numPeers = singleton.getPeerTable().length;

        //setting message type
        if (numPeers < fullLength) { msgtype = 1; }
        else { msgtype = 2; }

        //getting variables from singleton
        sequenceNumber = singleton.getSequenceNumber();
        let peertable = singleton.getPeerTable();

        //initializing a peer to peer message and send it
        PTPMessage.init(msgtype, senderid, peertable);
        sock.write(PTPMessage.getPacket())

        if (numPeers < fullLength) { //if the peer is accepted
            singleton.addPeerTable('127.0.0.1', (sock.remotePort - 1), sock);
        }
        else { //the peer is not accepted sending back a redirect message
            console.log('\n Peer Table Full: 127.0.0.1:', (sock.remotePort - 1), " redirected")
        }

        sock.on('close', function () {
        });

        sock.on('error', function () {
        })

        //if the server recieves ptp data data
        sock.on('data', function (data) {

            timestamp = singleton.getTimestamp();
            let binarystring = "";

            datasize = Buffer.byteLength(data);
            readBuffer = Uint8Array.from(data);

            //reading the data in a binary string
            for (let i = 0; i < datasize; i++) {
                let read = readBuffer[i];
                binarystringtemp = read.toString(2).padStart(8, "0");
                binarystring = binarystring + binarystringtemp;
            }
            //calling function to read the peer to peer message
            readPTP(binarystring, data)
        });
        return msgtype;
    }

};

function readPTP(binarystring, data) {

    let allimages = [];
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
    let peeraddressstring = peeradd1.toString() + "." + peeradd2.toString() + "." + peeradd3.toString() + "." +peeradd4.toString();
    let imageport = parseInt(binarystring.substring(index + 32, index + 48), 2);


    //checking to see if the packet has been seen before or it is from the same server
    let searchHistory = singleton.getRecentSearches();
    if (searchHistory.includes(searchid) || imageport == singleton.getImagePort()) {
        console.log('Dropping packet')
    } else {
        //adding packet to recent search list
        singleton.setRecentSearches(searchid, singleton.getPeerTable.length)

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
            allimages.push(imgname);
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

        if (imagesFound.length > 0) { //if there are images found send an ITP response back to image db
            console.log('Received cPTP search packet sending back', imagesFound);
          
            if (imagesFound.length == allimages.length){f = 1} else{f = 0} //if response is fullfulled
            if (imagesFound.length == 0) { res = 2 } else { res = 1 } //if response type is found

            //initializing an ITP response
            ITPresponse.init(7, f, res, singleton.getTimestamp(), singleton.getSequenceNumber(), arrnamefound, arrtypefound);
            newITPresponse = ITPresponse.getPacket();
            let findImages = new net.Socket();

            //creating a new connection and writing to image db
            findImages.connect({ port: imageport, host: peeraddressstring }, function () { });
            findImages.write(newITPresponse);
            findImages.end();

            //if not all images were found create a new PTP message and send it
            if (imagesNotFound.length > 0) {
                let searchId = Math.floor((Math.random() * 99) + 1);
                senderid = singleton.getSenderId()
                PTPpacket.init(v, imagesNotFound.length, searchId, senderid, '127.0.0.1', imageport, imagesNotFound);
                let searchpacket = PTPpacket.getBytePacket();
                peersearch(searchpacket)
            }
        } else { //if not images are found forward the cPTP search packet to peer table
            console.log('Received cPTP search packet. Images not found... forwarding packet');
            peersearch(data)
        }
    }
}

//function to forward cPTP packet 
function peersearch(searchpacket) {
    let peers = singleton.getPeerTable();
    for (let i = 0; i < peers.length; i++) {
        peers[i].SOCK.write(searchpacket);
    }
}

