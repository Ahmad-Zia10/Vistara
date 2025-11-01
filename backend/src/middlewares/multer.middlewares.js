import multer from "multer";



const storage = multer.diskStorage({                    //    where to store files on disk and how to name them.
  destination: function (req, file, cb) {
    cb(null, './public/temp')                   //destination where we want to save the file
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix)                   
  }
})

export const upload = multer({ storage: storage }) 
// instance of multer middleware, configured with your custom disk storage engine.




