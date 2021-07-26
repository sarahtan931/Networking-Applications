const ITPResponse = require('./ITPResponse');
let ITPpacket = require('./ITPResponse');
let singleton = require('./Singleton');

// You may need to add some delectation here

module.exports = {

    handleClientJoining: function (sock) {

        //getting client timestamp and sequence number
        clientTimestamp = singleton.getTimestamp()
        sequenceNumber = singleton.getSequenceNumber();

        console.log('Client-', clientTimestamp, 'is connected at timestamp', clientTimestamp)

        sock.on('close', function(){
            console.log('Client-', clientTimestamp, ' closed the connection')
        });

        sock.on('error', function(){  
        })
        

        sock.on('data', function(data) {
            let binarystring = ""
            let arrtype = [];
            let arrname = [];
     
            datasize = Buffer.byteLength(data);
            readBuffer = Uint8Array.from(data);
         
            //reading the data sent into a binary string
            for (i=0; i < datasize; i++){
                read = readBuffer[i];
                binarystringtemp = read.toString(2).padStart(8, "0");
                binarystring = binarystring + binarystringtemp;
            }
         
            //printing the data in the form of a binary string to the user
            var binaryfinal = binarystring.match(/.{1,8}/g).join(" "); 
            console.log('\nITP packet received: ', binaryfinal);
      
            //parsing the header information
            v = parseInt(binarystring.substring(0,3), 2);
            ic = parseInt(binarystring.substring(4, 8), 2);
            rt = parseInt(binarystring.substring(24, 32), 2);
        
            //converting the information to a string
            if (rt==0){ requeststring = "Query" }
            //declaring variables
            let finaltypestring = "";
            let finalnamestring = "";
            let newstart = 32;

            //looping through the payload of each image
            for (i = 0; i < ic; i++){
            let imgname = "";
            let typeend = newstart + 4;

            //parsing through the data and converting it to string
            type = parseInt(binarystring.substring(newstart, typeend), 2);
            if (type == 1){typestring = "BMP"}
            else if (type == 2){typestring = "JPEG"}
            else if (type == 3){typestring = "GIF"}
            else if (type == 4){typestring = "PNG"}
            else if (type == 4){typestring = "TIFF"}
            else if (type == 15){typestring = "RAW"}

            //adding the image type to an array
            finaltypestring = finaltypestring + ' '+ typestring ;
            arrtype.push(typestring)

            //parsing through the image name 
            nameend = typeend + 12;
            namelength = parseInt(binarystring.substring(typeend,nameend), 2);
    
            //looping through the image name bytes and converting to ascii
            for (j = nameend; j < (nameend + namelength*8); j = j+8){
            let charb = binarystring.substring(j, j+8)
            imgname = imgname+ String.fromCharCode(parseInt(charb, 2));
            }

            //adding the image names to an array
            finalnamestring = finalnamestring + imgname + ' ';
            arrname.push(imgname)
            newstart = nameend + namelength*8
            }

            //printing all decoded data to the user
            console.log('\n Client-', clientTimestamp, ' requests: ');
            console.log('\n --ITP version:', v,
            '\n --Image Count:',ic,
            "\n --Request type: ", requeststring,
            "\n --Image file extension(s):", finaltypestring, 
            "\n --Image file name(s): ", finalnamestring);

            //initializing a response packet and sending it to the client
            ITPpacket.init(7, rt, ic, clientTimestamp, sequenceNumber, arrname, arrtype);
            sock.write(ITPpacket.getPacket())
        });
    }
    
};




