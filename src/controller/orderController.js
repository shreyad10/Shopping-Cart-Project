const mongoose = require("mongoose");
const cartModel = require("../models/cartModel");
const orderModel = require("../models/orderModel");
//const ordreModel = require("../models/orderModel")
const {
  isValid,
  isValidString,
  isValidNumber,
  isValidPrice,
  isValidAvailableSizes,
  isValidId,
} = require("../validators/validation");

const createOrder = async (req, res) => {
  try {
    let data = req.body;
    let UserId = req.params.userId;
    // console.log(data.cartId,UserId)

    if (!data.cartId) {
      return res
        .status(400)
        .send({ staus: false, message: "Please Provide CardId" });
    }
    if (!UserId) {
      return res
        .send(400)
        .send({ staus: false, message: "Please Provide UserId" });
    }
    if (!isValidId(data.cartId)) {
      return res
        .status(400)
        .send({ status: false, message: "CardID is not valid" });
    }
    if (!isValidId(UserId)) {
      return res
        .status(400)
        .send({ status: false, message: "userID is not valid" });
    }
    let cardDetail = await cartModel.findOne({ _id: data.cartId });
    //return res.status(201).send({status:true,data:cardDetail})
    if (!cardDetail) {
      return res
        .status(404)
        .send({ status: false, message: "Card does not exist" });
    }
    if (cardDetail.userId != UserId) {
      return res.status(400).send({ status: false, message: "user not found" });
    }
    let obj = {};
    obj.userId = UserId;
    obj.items = cardDetail.items;

    obj.totalPrice = cardDetail.totalPrice;
    obj.totalItems = cardDetail.totalItems;

    let totalQuantity = 0;
    for (let product of cardDetail.items) {
      totalQuantity += product.quantity;
    }

    obj.totalQuantity = totalQuantity;

    let crearedata = await orderModel.create(obj);
    return res.status(201).send({ status: false, data: crearedata });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};

const updateOrder = async function (req, res) {
  try {
    let userId = req.params.userId;

    if (!isValid(userId) || !isValidId(userId))
      return res.status(400).send({ status: false, message: "Invalid userId" });

    let orderId = req.body.orderId;

    if (!isValid(orderId) || !isValidId(orderId))
      return res
        .status(400)
        .send({ status: false, message: "Invalid orderId" });

    let orderDetails = await orderModel.findOne({ _id: orderId });

    if (orderDetails.cancellable === true) {
      let orderStatus = await orderModel.findOneAndUpdate(
        { _id: orderId },
        { $set: { status: "completed" } },
        { new: true }
      );
      return res
        .status(200)
        .send({ status: true, message: "Cart Details", data: orderStatus });
    }
      else{
        return res
        .status(400)
        .send({ status: false, message: "Order is not cancelable" });
      }
   

  } catch (error) {
    res.status(500).send({ status: false, error: error.message });
  }
};

module.exports = { createOrder, updateOrder };
