import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import Customer from '../infra/typeorm/entities/Customer';
import ICustomersRepository from '../repositories/ICustomersRepository';


interface IRequest {
  name: string;
  email: string;
}


@injectable()
class CreateCustomerService {


  constructor(

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) { }


  public async execute({ name, email }: IRequest): Promise<Customer> {

    // Não pode haver mais de um cliente com o mesmo e-mail
    const checkCustomerExists = await this.customersRepository.findByEmail(email);
    if (checkCustomerExists) {
      throw new AppError('E-mail address already used.');
    }

    // Cria novo cliente
    const customer = await this.customersRepository.create({
      name,
      email,
    });

    return customer;
  }


}


export default CreateCustomerService;
