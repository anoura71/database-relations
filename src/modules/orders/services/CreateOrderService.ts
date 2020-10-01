import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';


interface IProduct {
  id: string;
  quantity: number;
}


interface IRequest {
  customer_id: string;
  products: IProduct[];
}


@injectable()
class CreateOrderService {


  constructor(

    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) { }


  public async execute({ customer_id, products }: IRequest): Promise<Order> {

    // Verifica se o cliente existe
    const customer = await this.customersRepository.findById(customer_id);
    if (!customer) {
      throw new AppError('Customer does not exist.');
    }

    // Verifica se a lista de produtos é composta de produtos que existem
    const existingProducts = await this.productsRepository.findAllById(products);
    if (!existingProducts.length) {
      // Nenhum id de produto foi encontrado
      throw new AppError('There are no products with valid ids.');
    }
    const existingProductIds = existingProducts.map(product => product.id);
    const inexistentProducts = products.filter(
      // Filtra os produtos cujo id não está na lista de ids de produtos existentes
      product => !existingProductIds.includes(product.id)
    );
    if (inexistentProducts.length) {
      // Há produto(s) com id inválido na lista passada como parâmetro
      throw new AppError(
        `Invalid product ids: [${inexistentProducts.forEach(invalidProduct => invalidProduct.id)}, ]`
      );
    }

    // Verifica se a quantidade solicitada para cada produto está disponível em estoque
    const productsWithUnavailableQuantity = products.filter(
      product => existingProducts.filter(
        p => p.id === product.id
      )[0].quantity < product.quantity,
    );
    if (productsWithUnavailableQuantity.length) {
      throw new AppError(
        `Product ids with unavailable quantity: [${inexistentProducts.forEach(unavailableProduct => unavailableProduct.id)}, ]`
      );
    }

    // Organiza os produtos em um objeto
    const serializedProducts = products.map(product => ({
      product_id: product.id,
      quantity: product.quantity,
      price: existingProducts.filter(p => p.id === product.id)[0].price,
    }));

    const order = await this.ordersRepository.create({
      customer,
      products: serializedProducts,
    });

    // Atualiza a quantidade de cada produto do pedido no estoque
    const { order_products } = order;
    const orderedProductsQuantity = order_products.map(product => ({
      id: product.product_id,
      quantity: existingProducts.filter(p => p.id === product.product_id)[0].quantity - product.quantity,
    }));
    await this.productsRepository.updateQuantity(orderedProductsQuantity);

    return order;
  }


}


export default CreateOrderService;
