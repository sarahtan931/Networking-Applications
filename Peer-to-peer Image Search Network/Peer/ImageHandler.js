let ITPresponse = require('./ITPResponse');
let PTPpacket = require('./cPTPRequest');
let singleton = require('./Singleton');
let fs = require('fs');

// You may need to add some delectation here

module.exports = {

    handleImageRequest: function (sock) {

        //getting client timestamp and sequence number
        clientTimestamp = singleton.getTimestamp()
        sequenceNumber = singleton.getSequenceNumber();


        console.log('Client-', clientTimestamp, 'is connected at timestamp', clientTimestamp)

        sock.on('close', function () {
            console.log('Client-', clientTimestamp, ' closed the connection')
        });

        sock.on('error', function () {
        })

        const chunks = [];
        sock.on('data', (chunk) => {

            let binarystring = ""
            let host = sock.remoteAddress;
            host = host.split(":").pop();

            datasize = Buffer.byteLength(chunk);
            readBuffer = Uint8Array.from(chunk);

            //reading the data sent into a binary string
            for (i = 0; i < datasize; i++) {
                read = readBuffer[i];
                binarystringtemp = read.toString(2).padStart(8, "0");
                binarystring = binarystring + binarystringtemp;
            }

            let isreq = binarystring.substring(0, 8);
            //if the packet is an itp request packet
            if (isreq == '00000001') {
                handleRequest(binarystring, sock, host);
            } else {
                chunks.push(chunk)
            }

        });

        sock.on('end', () => {
            convertData(chunks)
        })
    }
};

function handleRequest(binarystring, sock, host) {
    let imagesFound = [];
    let imagesNotFound = [];
    let arrtype = [];
    let arrname = [];
    setTimeout(() => sendResponse(imagesFound, arrtype, sock), 2000);

    binarystring = binarystring.substring(8, binarystring.length);

    //printing the data in the form of a binary string to the user
    var binaryfinal = binarystring.match(/.{1,8}/g).join(" ");
    console.log('\nITP packet received: ', binaryfinal);

    //parsing the header information
    v = parseInt(binarystring.substring(0, 3), 2);
    ic = parseInt(binarystring.substring(3, 8), 2);
    rt = parseInt(binarystring.substring(24, 32), 2);

    //declaring variables
    let finaltypestring = "";
    let finalnamestring = "";
    let newstart = 32;

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
        else if (type == 15) { typestring = "RAW" }

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

        let path = './images/' + imgname + "." + typestring;
        if (fs.existsSync(path)) { //if images exist push to image exist array, set as found
            let imagesFoundString = imgname + '.' + typestring;
            imagesFound.push(imagesFoundString);
            singleton.setImagesFound(imgname);
            singleton.setTypeFound(typestring);

        } else { //if images do not exist set as not found
            let imagesFoundString = imgname + '.' + typestring;
            imagesNotFound.push(imagesFoundString);
        }
    }

    //if all images are not found create a cPTP search packet and send it to all peers
    if (imagesNotFound.length > 0) {
        let searchId = Math.floor((Math.random() * 99) + 1)
        senderid = singleton.getSenderId();
        //initializing a ptp packet
        PTPpacket.init(v, imagesNotFound.length, searchId, senderid, host, singleton.getImagePort(), imagesNotFound);
        let searchpacket = PTPpacket.getBytePacket();
        //sending the ptp packet
        peersearch(searchpacket);
    }

    if (rt == 0) { rtstring = 'Query' }
    //printing all decoded data to the user
    console.log('\n Client-', clientTimestamp, ' requests: ');
    console.log('\n \t --ITP version:', v,
        '\n \t --Image Count:', ic,
        "\n \t --Request type: ", rtstring,
        "\n \t--Image file extension(s):", finaltypestring,
        "\n \t --Image file name(s): ", finalnamestring);
}

//sending images back to requesting client
function sendResponse(imagesFound, arrtype, sock) {
    if (imagesFound.length == arrtype.length) { f = 1 } else { f = 0 } //if response is fulfilled
    if (imagesFound.length == 0) { res = 2 } else { res = 1 } //if response type is found

    ITPresponse.init(7, f, res, clientTimestamp, sequenceNumber, singleton.getImagesFound(), singleton.getTypeFound());
    response = ITPresponse.getPacket()
    sock.write(response);
    sock.end();
    singleton.clearImageHistory();
}

//sending a search packet to all peers
function peersearch(searchpacket) {
    let peers = singleton.getPeerTable();
    for (let i = 0; i < peers.length; i++) {
        peers[i].SOCK.write(searchpacket);
    }
}

//function to decode packet sent from server
function convertData(chunks) {
    data = Buffer.concat(chunks)
    let binarystring = "";

    datasize = Buffer.byteLength(data);
    readBuffer = Uint8Array.from(data);

    //reading the data into a binary string
    for (let i = 0; i < datasize; i++) {
        read = readBuffer[i];
        binarystringtemp = read.toString(2).padStart(8, "0");
        binarystring = binarystring + binarystringtemp;
    }

    if (binarystring) {
        //printing the packet header
        let printstring = binarystring.substring(0, 64);
        printstring = printstring.match(/.{1,8}/g).join(" ");

        //parsing the header 
        v = parseInt(binarystring.substring(0, 3), 2);
        f = parseInt(binarystring.substring(3, 4), 2);
        rt = parseInt(binarystring.substring(4, 12), 2);
        ic = parseInt(binarystring.substring(12, 17), 2);
        sn = parseInt(binarystring.substring(17, 32), 2);
        ts = parseInt(binarystring.substring(32, 64), 2);

        //looping through the image payloads
        let newstart = 64;
        for (i = 0; i < ic; i++) {
            //getting the payload information
            imagetype = parseInt(binarystring.substring(newstart, newstart + 4), 2);
            filenamesize = parseInt(binarystring.substring(newstart + 4, newstart + 16), 2);
            imagesize = parseInt(binarystring.substring(newstart + 16, newstart + 32), 2);

            let headerTop = newstart + 32;

            //converting the payload information into strings
            if (imagetype == 1) { typestring = "BMP" }
            else if (imagetype == 2) { typestring = "JPEG" }
            else if (imagetype == 3) { typestring = "GIF" }
            else if (imagetype == 4) { typestring = "PNG" }
            else if (imagetype == 4) { typestring = "TIFF" }
            else if (imagetype == 15) { typestring = "RAW" }

            let imgname = "";
            let endofFileName = headerTop + filenamesize * 8;

            //looping through file name to decode the ascii string
            for (j = headerTop; j < endofFileName; j = j + 8) {
                let charb = binarystring.substring(j, j + 8)
                imgname = imgname + String.fromCharCode(parseInt(charb, 2));
            }

            newstart = endofFileName + imagesize * 8;

            //slicing the image buffer from the total buffer
            let img = data.slice(endofFileName / 8, newstart / 8)

            //getting the file name 
            typestring = typestring.toLowerCase();
            let imgnamefile = imgname + '.' + typestring;

            singleton.setImagesFound(imgname);
            singleton.setTypeFound(typestring);

            //writes a file to the file name and opens it
            let imgpath = 'images/' + imgnamefile;
            fs.writeFileSync(imgpath, img);
            fs.openSync(imgpath);
        }
    }

}