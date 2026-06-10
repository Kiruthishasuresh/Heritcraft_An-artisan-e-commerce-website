package com.heritcraft.userservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class SmsService {
    private static final Logger logger = LoggerFactory.getLogger(SmsService.class);

    public void sendSms(String phone, String message) {
        logger.info("\n" +
                "==================================================\n" +
                "                 SMS GATEWAY MOCK                 \n" +
                "==================================================\n" +
                "TO: {}\n" +
                "MESSAGE: {}\n" +
                "==================================================", phone, message);
    }
}
