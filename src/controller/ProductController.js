const mongoose = require("mongoose");
const { uploadFile } = require("../validators/aws");
const productModel = require("../models/productModel");
const {
  isValid,
  isValidString,
  isValidWords,
  isValidNumber,
  isValidPrice,
  isValidAvailableSizes,
  isValidId,
  isValidBody
} = require("../validators/validation");

const createProduct = async function (req, res) {
  try {
    let data = req.body;

    if(isValidBody(data))
    return res.status(400).send({
      status: false,
      message: "Request body can't be empty",
    });


    let {
      title,
      description,
      price,
      isFreeShipping,
      currencyId,
      currencyFormat,
      style,
      availableSizes,
      installments,
    } = data;

    // tilte validation
    if (!title)
      return res.status(400).send({
        status: false,
        message: "Product title is required",
      });

    if (!isValid(title) || !isValidWords(title))
      return res.status(400).send({
        status: false,
        message: "Product title is required and should not be an empty string",
      });

    let uniqueTitle = await productModel.findOne({ title: title });
    if (uniqueTitle)
      return res.status(400).send({
        status: false,
        message: `Title ${title}is already registerd`,
      });

    // description validation
    if (!description)
      return res.status(400).send({
        status: false,
        message: "Product description is required",
      });
    if (!isValid(description))
      return res.status(400).send({
        status: false,
        message:
          "Product description is required and should not be an empty string",
      });

    // price validation
    if (!price)
      return res.status(400).send({
        status: false,
        message: "Product price is required",
      });
    if (isValidNumber(price) || !isValidPrice(price))
      return res.status(400).send({
        status: false,
        message: "Product price is required and it should be a number",
      });

    // isFreeShipping validation

    if (isFreeShipping) {
      if (["true", "false"].includes(isFreeShipping) === false) {
        return res
          .status(400)
          .send({ status: false, message: "isFreeShipping should be boolean" });
      }
    }

    // currencyId validation
    if (!currencyId)
      return res.status(400).send({
        status: false,
        message: "currencyId is required",
      });
    if (!isValid(currencyId))
      return res.status(400).send({
        status: false,
        message: "currencyId is required and should not be an empty string",
      });

    if (currencyId != "INR") {
      return res
        .status(400)
        .send({ status: false, message: "currencyId should be INR" });
    }

    // currencyFormat validation
    if (!currencyFormat)
      return res.status(400).send({
        status: false,
        message: "currencyFormat is required",
      });
    if (!isValid(currencyFormat))
      return res.status(400).send({
        status: false,
        message: "currencyFormat is required and should not be an empty string",
      });
    if (currencyFormat != "₹")
      return res
        .status(400)
        .send({ status: false, message: "currency format should be ₹ " });

    // availableSizes validation
    if (availableSizes || availableSizes == "") {
      availableSizes = availableSizes
        .toUpperCase()
        .split(",")
        .map((x) => x.trim());
      data.availableSizes = availableSizes;
      if (!isValidAvailableSizes(availableSizes))
        return res.status(400).send({
          status: false,
          message: `availableSizes should be S, XS, M, X, L, XXL, XL only`,
        });
    }

    // style validation
    if (style) {
      if (!isValid(style) || !isValidWords(style))
        return res.status(400).send({
          status: false,
          message: "style should not be an empty string",
        });
    }

    // installments validation
    if (installments) {
      if (isValidNumber(installments) || !isValidPrice(installments))
        return res.status(400).send({
          status: false,
          message: "Installments should be a Number only",
        });
    }

    //aws s3 profileImage upload
    let files = req.files;

    if (!(files && files.length)) {
      return res.status(400).send({
        status: false,
        message: "Found Error in Uploading files...",
      });
    }
    let fileUploaded = await uploadFile(files[0]);
    data.productImage = fileUploaded;


    let product = await productModel.create(data);
    return res.status(201).send({
      status: true,
      message: "Success",
      data: product,
    });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};


//====================================get product============================================
const getByFilter = async function (req, res) {
  try {
    let data = req.query;
    let { size, name, priceLessThan } = data; //Destructuring

    // if (!data) return res.status(400).send({ status: false, message: "please give some data to get products list" })

    let ndata = {};

    if (size) {
      let sizeArr = size.replace(/\s+/g, "").split(",");
      var uniqueSize = sizeArr.filter(function (item, i, ar) {
        return ar.indexOf(item) === i;
      });

      let arr = ["S", "XS", "M", "X", "L", "XXL", "XL"];

      for (let i = 0; i < uniqueSize.length; i++) {
        if (!arr.includes(uniqueSize[i]))
          return res.status(400).send({
            status: false,
            data: "Enter a Valid Size, Like 'XS or S or M or X or L or XL or XXL'",
          });
      }
      ndata.availableSizes = { $in: sizeArr };
    }
    if (name) {
      ndata.title = { $regex: name, $options: "i" };
    }

    if (priceLessThan) {
      ndata.price = { $lt: Number(priceLessThan) };
    }

    let productDetail = await productModel
      .find({ isDeleted: false, ...ndata })
      .sort({ price: 1 });
    if (productDetail.length == 0)
      return res
        .status(404)
        .send({ status: false, message: "No product found" });

    return res.status(200).send({ status: true, message:"Success", data: productDetail });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

/////////---------------------Get By Id----------------//////////

const getById = async function (req, res) {
  let productId = req.params.productId;
  if (!isValidId(productId)) {
    return res
      .status(400)
      .send({ status: false, message: "please enter Valid productId ! " });
  }

  let product = await productModel.findOne({ _id: productId });
  if (!product) {
    return res.status(404).send({
      status: false,
      message: "this product id is not found in product collection ",
    });
  }
  if (product.isDeleted == true) {
    return res
      .status(400)
      .send({ status: false, message: "this product is deleted " });
  }

  return res
    .status(200)
    .send({ status: true, message: "Success", data: product });
};
///////////---------------------Update Product-----------------///////////

const updateProduct = async function (req, res) {
  try {
    let requestData = req.body;
    let productId = req.params.product_id;
    if (Object.keys(req.body).length == 0)
      return res
        .status(400)
        .send({
          status: false,
          message: "Please Enter Product Details For Updating",
        });

    if (!productId) {
      return res
        .status(400)
        .send({ status: false, message: "Productid must be present" });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res
        .status(400)
        .send({ status: false, message: `this  Product Id is not a valid Id` });
    }
    const {
      title,
      description,
      price,
      isFreeShipping,
      style,
      availableSizes,
      installments,
      productImage,
    } = requestData;
    // creating an empty object
    const updates = { $set: {} };

    const ProductInformation = await productModel.findOne({ _id: productId });
    if (!ProductInformation) {
      return res
        .status(404)
        .send({ status: false, msg: "no Product found with this ProductId" });
    }
    ////------------------------------////---------------------------////-----------------------////
    if (title) {
      if (!isValid(title)) {
        return res
          .status(400)
          .send({ status: false, message: "Invalid title" });
      }
      const notUniqueTitle = await productModel.findOne({ title: title });
      if (notUniqueTitle) {
        return res
          .status(400)
          .send({ status: false, message: "Product title already exist" });
      }

      updates["$set"]["title"] = title.trim();
      console.log(updates);
    }

    // if request body has key name "description" then after validating its value, same is added to updates object

    if (description) {
      if (!isValid(description)) {
        return res
          .status(400)
          .send({ status: false, message: "Invalid description" });
      }

      updates["$set"]["description"] = description.trim();
    }

    if (price) {
      if (!isValidPrice(price)) {
        return res
          .status(400)
          .send({ status: false, message: "Invalid price" });
      }

      updates["$set"]["price"] = price;
    }

    if (isFreeShipping) {
      if (["true", "false"].includes(isFreeShipping) === false) {
        return res
          .status(400)
          .send({ status: false, message: "isFreeShipping should be boolean" });
      }
      updates["$set"]["isFreeShipping"] = isFreeShipping;
    }

    //---- if request body has key name "style" then after validating its value, same is added to updates object
    if (style) {
      if (!isValid(style)) {
        return res
          .status(400)
          .send({ status: false, message: "Invalid style" });
      }
      updates["$set"]["style"] = style;
    }


    if (availableSizes) {
      if (typeof (availableSizes == "string")) {
        if (!isValidAvailableSizes(availableSizes)) {
          return res
            .status(400)
            .send({
              status: false,
              message: "Invalid format of availableSizes",
            });
        }
        let availableSize = ["S", "XS", "M", "X", "L", "XXL", "XL"];
        for (let i = 0; i < availableSize.length; i++) {
          if (availableSizes == availableSize[i]) {
            continue;
          }
        }
      } else {
        return res
          .status(400)
          .send({
            status: false,
            message: `avilablesize is ["S", "XS", "M", "X", "L", "XXL", "XL"] select size from avilablesize`,
          });
      }


      let availableArray = ProductInformation.availableSizes;
      for (let i = 0; i < availableArray.length; i++) {
        if (availableSizes == availableArray[i]) {
          return res
            .status(409)
            .send({
              status: false,
              message: "This Size is allready Available",
            });
        }
      }
      availableArray.push(availableSizes);
      updates["$set"]["availableSizes"] = availableArray;
    }

    if (installments) {
      if (!isValid(installments)) {
        return res
          .status(400)
          .send({ status: false, message: "invalid installments" });
      }
      updates["$set"]["installments"] = Number(installments);
    }

    // if request body has key name "image" then after validating its value, same is added to updates object

    let imageone = req.files;
    if (productImage) {
      if (!(imageone || imageone.length)) {
        return res.status(400).send({
          status: false,
          message: "Found Error in Uploading files...",
        });
      }
      let fileUploaded = await uploadFile(imageone[0]);
      updates.productImage = fileUploaded;
    }

    if (Object.keys(updates["$set"]).length === 0) {
      return res.json("nothing is updated");
    }
    //------------ updating product data of given ID by passing updates object----------//
    const updatedProduct = await productModel.findOneAndUpdate(
      { _id: productId },
      updates,
      { new: true }
    );

    return res
      .status(200)
      .send({
        status: true,
        message: "Product data updated successfully",
        data: updatedProduct,
      });
  } catch (error) {
    return res.status(400).send({ status: false, message: error });
  }
};

//=======================delete product by id=============================//

const deleteProduct = async function (req, res) {
  try {
    let id = req.params.productId;

    if (!isValidId(id)) {
      return res
        .status(400)
        .send({ status: false, message: "productId is Invalid" });
    }

    let product = await productModel.findOne({ _id: id });
    if (!product) {
      return res.status(404).send({
        status: false,
        message: "No Product found with given Product Id",
      });
    }

    if (product.isDeleted === true) {
      return res.status(200).send({
        status: true,
        message: "Product with given Id is Already Deleted",
      });
    }

    let deleteProduct = await productModel.updateOne(
      { _id: id },
      { isDeleted: true, deletedAt: Date.now() }
    );
    res
      .status(200)
      .send({ status: true, message: "Successfully deleted the product" });
  } catch (error) {
    res.status(500).send({ status: false, Error: err.message });
  }
};

module.exports = {
  createProduct,
  getByFilter,
  getById,
  updateProduct,
  deleteProduct,
};
