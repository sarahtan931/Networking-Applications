module.exports = {

    init: function (version, imgCount, searchId, senderid, host, port, imgarray) {
      //creating an empty buffer for the header
      let headerBuffer = Buffer.alloc(4);
      let headerTop = Buffer.alloc(2);
     
      let senderidlength = senderid.length;
      version = 7; //change that
      messagetype = 3; 
    
      //creating header using bit shifting
      version = this.makeBinaryString(0, 7, 0)
      temp1 = this.makeBinaryString(version, messagetype, 8);
      temp2 = this.makeBinaryString(temp1, imgarray.length, 5);
      headerTop.writeUInt16BE(temp2)
     
      let searchidB = Buffer.alloc(1);
      searchidB.writeUInt8(searchId);

      let senderlengthB = Buffer.alloc(1);
      senderlengthB.writeUInt8(senderidlength)

      //creating header
      headerBuffer = Buffer.concat([headerTop, searchidB, senderlengthB])
   
      let idlength = Buffer.byteLength(senderid);
      let senderIdBuffer = Buffer.alloc(idlength);
      senderIdBuffer.write(senderid, 'ascii');
    
      //creating a 4 byte buffer for the address
      let addr = host.split('.');
      let addressBuffer = Buffer.alloc(4);

      let ad0 = Buffer.alloc(1);
      ad0.writeUInt8(parseInt(addr[0]));

      let ad1 = Buffer.alloc(1);
      ad1.writeUInt8(parseInt(addr[1]))
     
      let ad2 = Buffer.alloc(1);
      ad2.writeUInt8(parseInt(addr[2]))
      
      let ad3 = Buffer.alloc(1);
      ad3.writeUInt8(parseInt(addr[3]))

      addressBuffer = Buffer.concat([ad0, ad1, ad2, ad3])

      let socketBuffer = Buffer.alloc(2)
      socketBuffer.writeUInt16BE(port)
  
      //creating an empty buffer for the payload
      let finalpayload = Buffer.alloc(0);
  
      //looping through the images to get their names and types
      //making a payload for each image and adding it to the final payload
      for(let i = 0; i < imgCount; i++){
          let img = imgarray[i].toString().split('.');
          let imagename = img[0];
          let imagetype = img[1];
          payload = this.makePayload(imagename, imagetype);
          finalpayload = Buffer.concat([finalpayload, payload]);
      }
      //creating a request packet to send to the server
      this.requestBuffer = Buffer.concat([headerBuffer, senderIdBuffer, addressBuffer, socketBuffer, finalpayload])
    
    },
  
    makePayload: function(imagename, imagetype){
      //creating an empty buffer to add payload information to
      let imgInfo = Buffer.alloc(2);
  
      //converting the image type as an integer
      imagetype = imagetype.toString().toLowerCase();
      if (imagetype == "bmp"){ binaryImgTyp = 1; }
      else if (imagetype == "jpeg"){ binaryImgTyp = 2; }
      else if (imagetype == "gif"){ binaryImgTyp = 3; }
      else if (imagetype == "png"){  binaryImgTyp = 4; }
      else if (imagetype == "tiff"){ binaryImgTyp = 5; }
      else if(imagetype == "raw"){binaryImgTyp = 15; }
  
     // getting the size of the image name
      imgnamesize= Buffer.byteLength(imagename);
     
      //adding the image info into the buffer
      let imginfoB = this.makeBinaryString(binaryImgTyp, imgnamesize, 12)
      imgInfo.writeInt16BE(imginfoB)
  
      //creating a buffer that is the size of the image name 
      //writing the image name in ASCII
      let imagenameB = Buffer.alloc(imgnamesize);
      imagenameB.write(imagename, 'ASCII');
     
      //adding the image info and image name into a payload
      let payload = Buffer.concat([imgInfo, imagenameB]);
      return payload;
    
    },
  
    //using bitwise operations to add values 
    makeBinaryString: function(prevval, newval, bitShift){
      let shiftedval = prevval << bitShift;
      let input = shiftedval | newval;
      return input
  },
  
  //getting the byte packet
    getBytePacket: function () {
      return this.requestBuffer;
    },

  };