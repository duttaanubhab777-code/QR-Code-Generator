const input = document.getElementById("input-text") ;
const size  = document.getElementById("size") ;
const genBtn = document.getElementById("gen") ;
const downloadBtn= document.getElementById("download-btn") ;
const qrContainer= document.getElementById("qrcode") ;


let qrCode = null; 

genBtn.addEventListener("click",() =>{
const url = input.value.trim();
     if(url==="") {alert("please enter a URL");
     return;
         
     }
     qrContainer.innerHTML ="";
     const selectedSize=Number(size.value);
     
     qrCode = new QRCode(qrContainer,{
     
     text : url,
     height :selectedSize ,
     width : selectedSize 
         
     });
     

    
});


downloadBtn.addEventListener("click", () => {
    const qrCanvas = qrContainer.querySelector("canvas");

    if (!qrCanvas) {
        alert("Please generate a QR code first");
        return;
    }

    const url = input.value.trim();
    const extraHeight = 90;

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = qrCanvas.width;
    finalCanvas.height = qrCanvas.height + extraHeight;

    const ctx = finalCanvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

    ctx.drawImage(qrCanvas, 0, 0);

    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";

    let fontSize = 20;
    const maxWidth = finalCanvas.width - 20;

    ctx.font = `${fontSize}px Arial`;
    while (ctx.measureText(url).width > maxWidth && fontSize > 10) {
        fontSize--;
        ctx.font = `${fontSize}px Arial`;
    }

    ctx.fillText(url, finalCanvas.width / 2, qrCanvas.height + 30);

    ctx.fillStyle = "#ff5e00";
    ctx.font = "bold 16px Arial";
    ctx.fillText("Created by Anubhab Dutta", finalCanvas.width / 2, qrCanvas.height + 60);

    const link = document.createElement("a");
    link.download = "qrcode.png";
    link.href = finalCanvas.toDataURL("image/png");
    link.click();
});
