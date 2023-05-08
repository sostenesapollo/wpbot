import api from './api';
import logger from './util/logger';

const PORT = process.env.PORT || 3000;

api.listen(PORT, ()=>{logger.info(`Server is running at port ${PORT}`)})