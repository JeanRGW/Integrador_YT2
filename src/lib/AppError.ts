class AppError extends Error {
    public code: number;

    constructor (msg: string, code: number = 400){
        super(msg);
        this.code = code;
    }
}