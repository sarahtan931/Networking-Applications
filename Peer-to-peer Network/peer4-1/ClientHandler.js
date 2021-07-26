const PTPMessage = require('./PTPMessage');
let singleton = require('./Singleton');

// You may need to add some delectation here

module.exports = {

    handleClientJoining: function (sock, fullLength, senderid) {
       
        numPeers = singleton.getPeerTable().length;
        clientTimestamp = singleton.getTimestamp()
        sequenceNumber = singleton.getSequenceNumber();

        if (numPeers < fullLength){
            msgtype = 1;
            singleton.addPeerTable('127.0.0.1', (sock.remotePort - 1))
        }
        //send back a redirect message
        else{
            msgtype = 2;
            console.log('\n')
            console.log('Peer Table Full: 127.0.0.1:', (sock.remotePort-1), " redirected")
        }

        let peertable = singleton.getPeerTable();
       
        //initialized a peer to peer message and send it
        PTPMessage.init(msgtype, senderid, peertable);
        sock.write(PTPMessage.getPacket())
       
        sock.on('close', function(){
        });

        sock.on('error', function(){    
        })
        
        sock.on('data', function(data) {
        });

        return msgtype;
    }
    
};

