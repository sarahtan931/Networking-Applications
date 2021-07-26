module.exports = {

    init: function(msgtype, senderid, peertable) { 
        //creating header buffers
        const buffer1 = Buffer.alloc(4);
        v = 7;
        numPeers = peertable.length;

        //initializing empty buffers to store payload
        let finalpayload = Buffer.alloc(0);
        let payload = Buffer.alloc(0);
        
        //looping through the peers and creating a payload for each one
        for(i = 0; i < numPeers ; i++){
            let address = peertable[i].HOST;
            let portnum = peertable[i].PORT;
            payload = this.makePayload(address, portnum);

            //if no peers in peertable, payload is 0
            if(!payload){
                f = 0;
                payload = Buffer.alloc(0)
            }
            //concatenating all peer payloads into a final one
            finalpayload = Buffer.concat([finalpayload, payload]);   
        }  

       //creating header buffer
        temp1 = this.makeBinaryString(0, 7, 0);
        temp2 = this.makeBinaryString(temp1, msgtype, 8);
        temp3 = this.makeBinaryString(temp2, numPeers, 13);
        header = this.makeBinaryString(temp3, senderid.length, 8);

       // writing the integers to the header buffer
        buffer1.writeInt32BE(header);

        const buffer2 = Buffer.alloc(senderid.length);
        buffer2.write(senderid, 'ascii');

        //adding the buffers to make the header
        headerBuffer = Buffer.concat([buffer1, buffer2]);

       //creating a packet to send to the client
        this.packet = Buffer.concat([headerBuffer, finalpayload]);

    },

    makePayload: function(address, portnum){
        //making payload of peers
        try{
          
            let ipAddress = Buffer.alloc(4);
            addr=address.split('.');
            
            //turning the address into an integer value
            ipInt = (+addr[0] << 24) + (+addr[1] << 16) + (+addr[2] << 8) + (+addr[3]);
            ipAddress.writeInt32BE(ipInt)
           
            //writing the port number to a 2 byte buffer
            let portNumber = Buffer.alloc(2);
            portNumber.writeUInt16BE(portnum);
            
            //adding the 4 byte ip address field to the 2 byte port number field
            payload = Buffer.concat([ipAddress, portNumber]);
            return payload;

        }catch(e){
            console.log(e)
            console.log('Does not exist');
            return 0;
        }
    },
    
      //using bitwise operations to add values 
    makeBinaryString: function(prevval, newval, bitShift){
        let shiftedval = prevval << bitShift;
        let input = shiftedval | newval;
        return input
    },
   
    getPacket: function() {
        return this.packet
    },

};

