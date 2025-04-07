const nodemailer = require('nodemailer')
require("dotenv").config();

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.APP_EMAIL,
        pass: process.env.APP_PASSWORD
    }
})

const sendEmail = async (email,subject,content) => {
    try {
       const response = await transporter.sendEmail({
        
            to: email,
            sender: process.env.APP_EMAIL,
            subject,
            html: content
        })
        return {
            success: true
        }
} catch (error){
   return{
    success: false,
    error: error.message
   }
}
   

    
}


module.exports = sendEmail;