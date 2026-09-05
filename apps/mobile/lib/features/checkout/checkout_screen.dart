import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/cart_cubit.dart';
import '../../cubits/order_cubit.dart';
import '../../core/enums/enums.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _provinceController = TextEditingController();
  PaymentMethod _paymentMethod = PaymentMethod.cod;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _provinceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Checkout',
          style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: BlocListener<OrderCubit, OrderState>(
        listener: (context, state) {
          if (state is OrderCreated) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Order placed successfully!'),
                backgroundColor: Color(0xFF10B981),
              ),
            );
            context.read<CartCubit>().clearCart();
            Navigator.of(context).pushNamedAndRemoveUntil(
              '/order-detail',
              (route) => route.isFirst,
              arguments: state.order.id,
            );
          } else if (state is OrderError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.red),
            );
          }
        },
        child: BlocBuilder<CartCubit, CartState>(
          builder: (context, cartState) {
            final cart = cartState is CartLoaded ? cartState.cart : null;
            final shippingFee = (cart?.subtotalPkr ?? 0) >= 5000 ? 0.0 : 200.0;
            final total = (cart?.subtotalPkr ?? 0) + shippingFee;

            return Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildSection(
                            'Delivery Address',
                            Icons.location_on,
                            Column(
                              children: [
                                _buildValidatedField('Full Name', _nameController, validator: (v) {
                                  if (v == null || v.trim().isEmpty) return 'Name is required';
                                  return null;
                                }),
                                const SizedBox(height: 8),
                                _buildValidatedField('Phone', _phoneController, keyboard: TextInputType.phone, validator: (v) {
                                  if (v == null || v.trim().isEmpty) return 'Phone is required';
                                  if (v.trim().length < 10) return 'Enter a valid phone number';
                                  return null;
                                }),
                                const SizedBox(height: 8),
                                _buildValidatedField('Address', _addressController, validator: (v) {
                                  if (v == null || v.trim().isEmpty) return 'Address is required';
                                  return null;
                                }),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Expanded(child: _buildValidatedField('City', _cityController, validator: (v) {
                                      if (v == null || v.trim().isEmpty) return 'City is required';
                                      return null;
                                    })),
                                    const SizedBox(width: 8),
                                    Expanded(child: _buildValidatedField('Province', _provinceController, validator: (v) {
                                      if (v == null || v.trim().isEmpty) return 'Province is required';
                                      return null;
                                    })),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        const SizedBox(height: 16),
                        _buildSection(
                          'Payment Method',
                          Icons.payment,
                          Column(
                            children: PaymentMethod.values.map((method) {
                              return RadioListTile<PaymentMethod>(
                                value: method,
                                groupValue: _paymentMethod,
                                onChanged: (v) => setState(() => _paymentMethod = v!),
                                title: Text(method.label),
                                activeColor: const Color(0xFFF59E0B),
                                contentPadding: EdgeInsets.zero,
                              );
                            }).toList(),
                          ),
                        ),
                        const SizedBox(height: 16),
                        if (cart != null)
                          _buildSection(
                            'Order Summary',
                            Icons.receipt,
                            Column(
                              children: [
                                _summaryRow('Subtotal (${cart.itemCount} items)', 'PKR ${cart.subtotalPkr.round()}'),
                                _summaryRow('Delivery', shippingFee == 0 ? 'Free' : 'PKR ${shippingFee.round()}'),
                                const Divider(),
                                _summaryRow('Total', 'PKR ${total.round()}', isBold: true),
                              ],
                            ),
                          ),
                       ],
                    ),
                  ),
                ),
                ),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 10,
                        offset: const Offset(0, -2),
                      ),
                    ],
                  ),
                  child: BlocBuilder<OrderCubit, OrderState>(
                    builder: (context, orderState) {
                      return SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: orderState is OrderLoading
                              ? null
                              : () {
                                  if (_formKey.currentState?.validate() != true) return;
                                  context.read<OrderCubit>().createOrder(
                                        buyerName: _nameController.text,
                                        buyerPhone: _phoneController.text,
                                        shippingAddress: _addressController.text,
                                        shippingCity: _cityController.text,
                                        shippingProvince: _provinceController.text,
                                        paymentMethod: _paymentMethod.name.toUpperCase(),
                                        items: cart?.items
                                            .map((item) => {
                                                  'product_id': item.productId,
                                                  'quantity': item.quantity,
                                                  'unit_price_pkr': item.unitPricePkr,
                                                })
                                            .toList(),
                                      );
                                },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFF59E0B),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            elevation: 0,
                          ),
                          child: orderState is OrderLoading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : Text(
                                  'Place Order - PKR ${total.round()}',
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildSection(String title, IconData icon, Widget child) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: const Color(0xFFF59E0B)),
              const SizedBox(width: 8),
              Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  Widget _buildValidatedField(String label, TextEditingController controller,
      {TextInputType keyboard = TextInputType.text, String? Function(String?)? validator}) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboard,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: Colors.grey.shade500, fontSize: 13),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: Colors.grey.shade200),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(0xFFF59E0B)),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Colors.red),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        isDense: true,
      ),
    );
  }

  Widget _summaryRow(String label, String value, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isBold ? 16 : 14,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: isBold ? 16 : 14,
              fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
