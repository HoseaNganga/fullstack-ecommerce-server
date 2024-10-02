const { ProductModel } = require("../models/product");
const express = require("express");
const router = express.Router();

/*  WORK ON FILE UPLOADS   
const multer=require('multer');

var imagesArr=[];

cloudinary.config({
  cloud_name: process.env.cloudinary_Config_Cloud_Name,
  api_key: process.env.cloudinary_Config_api_key,
  api_secret: process.env.cloudinary_Config_api_secret,
});

const storage=multer.diskStorage({
  destination:function(req,file,cb){
    cb(null,"uploads");
  },
  filename:function(req,file,cb){
    cb(null,`${Date.now()}_${file.originalname}`)
  }
})

const upload=multer({storage:storage});

router.post('/upload',upload.array("images"),async(req,res)=>{
  imagesArr=[];
  const files=req.files;
  for(let i=0;i<files.length;i++){
    imagesArr.push(files[i].filename)
  };
  console.log(imagesArr);
  res.json(imagesArr)
  })

*/

/* router.get("/", async (req, res) => {
  const productList = await ProductModel.find();
  if (!productList) {
    res.status(500).json({ success: false });
  }
  res.send(productList);
}); */

router.get("/", async (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "No search query has been provided",
      });
    }

    const productList = await ProductModel.find({
      $or: [
        {
          name: { $regex: query, $options: "i" },
        },
        {
          brand: { $regex: query, $options: "i" },
        },
        {
          catName: { $regex: query, $options: "i" },
        },
      ],
    });

    return res.status(200).json({
      productList: productList,
      success: true,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: "Couldnt fetch the queried items " });
  }
});

module.exports = router;
