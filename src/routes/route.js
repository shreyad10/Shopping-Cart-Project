const express = require('express')
const router = express.Router();
const {createUser,loginUser, userDetails , updateUser} = require("../controller/UserController")
const { createProduct, getByFilter,getById,deleteProduct, updateProduct } =  require("../controller/ProductController")
const {createCart ,updateCart,getCartDetails,deleteCart} = require("../controller/cartController")
const {authorise, authenticate}= require("../middlewares/auth")

//user creation part
router.post("/register",createUser)
router.post("/login",loginUser)
router.get("/user/:userId/profile",authenticate, userDetails)
router.put("/user/:userId/profile",authenticate, authorise, updateUser )

//product creation part 
router.post("/products",createProduct)
router.get("/products", getByFilter)
router.get("/products/:productId",getById)
router.put("/products/:product_id",updateProduct)
router.delete("/products/:productId",deleteProduct)

// cart creation part 

router.post( "/users/:userId/cart",createCart)
route.delete("/users/:userId/cart",authenticate,authorise,deleteCart)



module.exports=router 