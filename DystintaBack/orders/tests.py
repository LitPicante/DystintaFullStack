from django.test import TestCase

from accounts.models import User
from orders.models import Order
from orders.serializers import OrderCreateSerializer
from orders.services.assignment_service import select_designer_for_new_order
from orders.services.whatsapp_service import build_order_status_message


class OrderAssignmentServiceTests(TestCase):
    def create_designer(self, username):
        return User.objects.create_user(
            username=username,
            password="test123",
            role=User.ROLE_DESIGNER,
            is_active=True,
        )

    def create_order_payload(self, index):
        return {
            "service": Order.SERVICE_DTF_TEXTIL,
            "name": f"Cliente {index}",
            "phone": f"098231731{index}",
            "email": "",
            "quantity": "1",
            "details": "Pedido de prueba",
        }

    def create_order_from_serializer(self, index):
        serializer = OrderCreateSerializer(data=self.create_order_payload(index))
        serializer.is_valid(raise_exception=True)
        return serializer.save()

    def test_returns_none_when_no_active_designers_exist(self):
        self.assertIsNone(select_designer_for_new_order())

    def test_assigns_new_orders_to_designers_by_load_then_id(self):
        designer_1 = self.create_designer("designer-1")
        designer_2 = self.create_designer("designer-2")
        designer_3 = self.create_designer("designer-3")

        first = self.create_order_from_serializer(1)
        second = self.create_order_from_serializer(2)
        third = self.create_order_from_serializer(3)
        fourth = self.create_order_from_serializer(4)

        self.assertEqual(first.assigned_to_id, designer_1.id)
        self.assertEqual(second.assigned_to_id, designer_2.id)
        self.assertEqual(third.assigned_to_id, designer_3.id)
        self.assertEqual(fourth.assigned_to_id, designer_1.id)

    def test_ignores_inactive_designers(self):
        inactive = self.create_designer("inactive")
        inactive.is_active = False
        inactive.save(update_fields=["is_active"])
        active = self.create_designer("active")

        order = self.create_order_from_serializer(1)

        self.assertEqual(order.assigned_to_id, active.id)

    def test_whatsapp_message_includes_order_number_and_designer(self):
        designer = self.create_designer("designer-1")
        designer.display_name = "Ana Designer"
        designer.save(update_fields=["display_name"])
        order = Order.objects.create(
            service=Order.SERVICE_DTF_TEXTIL,
            name="Cliente Uno",
            phone="0982317317",
            order_number="15",
            status=Order.STATUS_DISENO,
            assigned_to=designer,
        )

        message = build_order_status_message(order)

        self.assertIn("Hola Cliente Uno", message)
        self.assertIn("tu pedido 15", message)
        self.assertIn("esta a cargo de Ana Designer", message)
        self.assertIn("se encuentra en En dise", message)
