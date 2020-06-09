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

interface IProductData {
  product_id: string;
  quantity: number;
  price: number;
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
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customerExists = await this.customersRepository.findById(customer_id);
    if (!customerExists) {
      throw new AppError('Customer does not exist');
    }

    const productsId = products.map(product => ({ id: product.id }));

    const productsData = await this.productsRepository.findAllById(productsId);

    const updatedQuantity: IProduct[] = [];
    const newProducts: IProductData[] = [];

    products.forEach(product => {
      const data = productsData.find(
        productData => productData.id === product.id,
      );

      if (!data) {
        throw new AppError('produc not found');
      }

      if (product.quantity > data.quantity) {
        throw new AppError('Quantity not disponible');
      }

      updatedQuantity.push({
        quantity: data.quantity - product.quantity,
        id: product.id,
      });

      newProducts.push({
        product_id: product.id,
        quantity: product.quantity,
        price: data.price,
      });
    });

    await this.productsRepository.updateQuantity(updatedQuantity);

    const order = await this.ordersRepository.create({
      customer: customerExists,
      products: newProducts,
    });

    return order;
  }
}

export default CreateOrderService;
