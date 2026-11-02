import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    toast({
      title: 'Redirecting',
      description: 'Please use the "Forgot your password?" link on the sign-in page.',
    });
    navigate('/signin');
  }, []);

  return null;
};

export default ResetPassword;
