module.exports = exports.default = {
    schema: './src/models/*.graphql',
    documents: './src/models/*.graphql',
    extensions:{
        customExtension: {foo: true}
    }
};