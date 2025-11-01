const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req,res,next)).catch((err)=> next(err)) //we pass on the error to the next(middleware) , however it wants to handle.
    }
}

export default asyncHandler;