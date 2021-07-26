module.exports = {

    init: function (version, imageCount, requestType, images) {
      //creating an empty buffer for the header
      let headerBuffer = Buffer.alloc(4);
    
      //using bit shifting to create an integer to write to the header
      temp1 = this.makeBinaryString(0, version, 0);
      temp2 = this.makeBinaryString(version, imageCount, 5);
      temp3 = this.makeBinaryString(temp2, 0, 16);
      temp4 = this.makeBinaryString(temp3, requestType, 8);
      
      //writing binary string value to header
      headerBuffer.writeInt32BE(temp4);
  
      //creating an empty buffer for the payload
      let finalpayload = Buffer.alloc(0);
  
      //looping through the images to get their names and types
      //making a payload for each image and adding it to the final payload
      for(imageCount; imageCount > 0; imageCount--){
          let img = images[imageCount-1].toString().split('.');
          let imagename = img[0];
          let imagetype = img[1];
          payload = this.makePayload(imagename, imagetype);
          finalpayload = Buffer.concat([finalpayload, payload]);
      }

      let req = Buffer.alloc(1);
      req.writeInt8(1)

      //creating a request packet to send to the server
      this.requestBuffer = Buffer.concat([req, headerBuffer, finalpayload])
    
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
  
    getBitPacket: function () {
    },
  };