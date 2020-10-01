import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import Product from '../infra/typeorm/entities/Product';
import IProductsRepository from '../repositories/IProductsRepository';

interface IRequest {
  name: string;
  price: number;
  quantity: number;
}


@injectable()
class CreateProductService {


  constructor(

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    ) {}


  public async execute({ name, price, quantity }: IRequest): Promise<Product> {

    // Não pode haver mais de um produto com o mesmo nome
    const checkProductExists = await this.productsRepository.findByName(name);
    if (checkProductExists) {
      throw new AppError('Product already exists.');
    }

    // Cria novo produto
    const product = await this.productsRepository.create({
      name,
      price,
      quantity,
    });

    return product;
  }


}

export default CreateProductService;
